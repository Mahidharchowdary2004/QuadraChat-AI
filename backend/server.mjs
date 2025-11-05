import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import path from 'path';
import { fileURLToPath } from 'url';
import Razorpay from 'razorpay';
import { v4 as uuidv4 } from 'uuid';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: '.env.server' });

// Debug logging for environment variables
console.log('Environment variables loaded:');
console.log('OPENROUTER_API_KEY:', process.env.OPENROUTER_API_KEY ? 'Loaded' : 'Not found');
console.log('OPENAI_GPT5_NANO_KEY:', process.env.OPENAI_GPT5_NANO_KEY ? 'Loaded' : 'Not found');
console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID ? 'Loaded' : 'Not found');
console.log('Current working directory:', process.cwd());

const app = express();
const PORT = process.env.PORT || 3001; // Keep 3001 for the server

// Initialize Razorpay
let razorpayInstance = null;
if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('Razorpay initialized successfully');
} else {
  console.warn('Razorpay not configured - payment features will be disabled');
}

// Middleware
app.use(express.json());

// CORS middleware
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  
  if (req.method === 'OPTIONS') {
    res.sendStatus(200);
  } else {
    next();
  }
});

// Rate limiting - disabled by default in development, configurable via environment variables
const isDevelopment = process.env.NODE_ENV !== 'production';
const disableRateLimit = process.env.DISABLE_RATE_LIMIT === 'true' || isDevelopment;

const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60 * 1000, // 60 seconds
  max: parseInt(process.env.RATE_LIMIT_MAX) || 100, // 100 requests per minute
  message: {
    error: 'Rate limit exceeded. Please wait before sending another request.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
  skip: () => disableRateLimit
});

// Apply rate limiting to the chat endpoint (unless disabled)
if (!disableRateLimit) {
  app.use('/api/chat', limiter);
  console.log(`Rate limiting enabled: ${parseInt(process.env.RATE_LIMIT_MAX) || 100} requests per ${parseInt(process.env.RATE_LIMIT_WINDOW_MS) / 1000 || 60} seconds`);
} else {
  console.log('Rate limiting is DISABLED (development mode)');
}

// Plan definitions with original limits
const PLANS = {
  FREE: {
    name: "Free Pack",
    price: 0,
    tokenLimit: 100000, // 100k tokens
    features: ["Basic chat functionality"]
  },
  COLLEGE: {
    name: "College Pack",
    price: 99,
    tokenLimit: 500000, // 500k tokens
    features: ["Enhanced chat functionality", "Priority support"]
  },
  LITE: {
    name: "Lite Pack",
    price: 299,
    tokenLimit: 2000000, // 2M tokens
    features: ["Advanced chat functionality", "Priority support", "Extended history"]
  },
  PRO: {
    name: "Pro Pack",
    price: 599,
    tokenLimit: 10000000, // 10M tokens
    features: ["Premium chat functionality", "24/7 support", "Unlimited history", "Custom models"]
  }
};

// In-memory storage for user entitlements (in production, this would be in a database)
const userEntitlements = {};

// In-memory storage for payment transactions (in production, this would be in a database)
const paymentTransactions = {};

// Get user entitlements
const getUserEntitlements = (userId) => {
  // If user doesn't exist, create default free plan
  if (!userEntitlements[userId]) {
    userEntitlements[userId] = {
      userId,
      plan: 'FREE',
      tokenUsage: 0,
      tokenLimit: PLANS.FREE.tokenLimit,
      expiresAt: null
    };
  }
  
  return userEntitlements[userId];
};

// Update user token usage
const updateUserTokenUsage = (userId, tokens) => {
  const entitlements = getUserEntitlements(userId);
  entitlements.tokenUsage += tokens;
  
  // Check if user has exceeded their limit
  if (entitlements.tokenUsage >= entitlements.tokenLimit) {
    console.log(`User ${userId} has exceeded token limit: ${entitlements.tokenUsage}/${entitlements.tokenLimit}`);
  }
  
  return entitlements;
};

// Check if user has exceeded token limit
const hasExceededTokenLimit = (userId) => {
  const entitlements = getUserEntitlements(userId);
  return entitlements.tokenUsage >= entitlements.tokenLimit;
};

// Create a payment transaction
const createPaymentTransaction = (userId, plan) => {
  const transactionId = uuidv4();
  const transaction = {
    id: transactionId,
    userId,
    plan,
    amount: PLANS[plan].price,
    status: 'pending',
    createdAt: new Date(),
    updatedAt: new Date()
  };
  
  paymentTransactions[transactionId] = transaction;
  return transaction;
};

// Update payment transaction status
const updatePaymentTransactionStatus = (transactionId, status) => {
  if (!paymentTransactions[transactionId]) {
    return null;
  }
  
  paymentTransactions[transactionId].status = status;
  paymentTransactions[transactionId].updatedAt = new Date();
  
  return paymentTransactions[transactionId];
};

// Upgrade user plan
const upgradeUserPlan = (userId, plan) => {
  const entitlements = getUserEntitlements(userId);
  
  // Update plan details
  entitlements.plan = plan;
  entitlements.tokenLimit = PLANS[plan].tokenLimit;
  
  // Reset usage if upgrading to a higher plan (optional business logic)
  // entitlements.tokenUsage = 0;
  
  // Set expiration (optional for time-based plans)
  entitlements.expiresAt = null; // No expiration for one-time purchases
  
  return entitlements;
};

// Function to call OpenAI API with exponential backoff
async function callOpenAIWithRetry(messages, maxRetries = 5, provider = 'openrouter') {
  let API_KEY;
  let API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
  let model = 'openai/gpt-3.5-turbo';

  // Select API key and endpoint based on provider
  switch(provider) {
    case 'openrouter':
      API_KEY = process.env.OPENROUTER_API_KEY;
      API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
      model = 'openai/gpt-3.5-turbo'; // Default model for OpenRouter
      break;
    case 'gpt5-nano':
      // GPT-5 Nano uses the specific GPT-5 Nano key with OpenRouter's endpoint
      API_KEY = process.env.OPENAI_GPT5_NANO_KEY;
      API_ENDPOINT = 'https://openrouter.ai/api/v1/chat/completions';
      model = 'openai/gpt-5-nano';
      break;
    default:
      // Default to OpenRouter if invalid provider is specified
      API_KEY = process.env.OPENROUTER_API_KEY;
      model = 'openai/gpt-3.5-turbo';
      break;
  }
  
  // Debug logging for API key (first 10 characters only for security)
  console.log(`${provider} API_KEY (first 10 chars):`, API_KEY ? API_KEY.substring(0, 10) + '...' : 'Missing');

  console.log(`${provider} API_KEY value:`, API_KEY ? 'Present' : 'Missing');
  if (!API_KEY) {
    throw new Error(`${provider} API key is not configured`);
  }

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to call ${provider} API (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      const response = await fetch(API_ENDPOINT, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${API_KEY}`,
          'Content-Type': 'application/json',
          // Add OpenRouter specific headers if needed
          ...(provider === 'openrouter' || provider === 'gpt5-nano') && {
            'HTTP-Referer': 'http://localhost:5173', // Your site URL
            'X-Title': 'Quadra Chatbox'
          }
        },
        body: JSON.stringify({
          model: model,
          messages: messages,
          max_tokens: 500,
        }),
      });

      if (!response.ok) {
        if (response.status === 429) {
          // Rate limit error - implement exponential backoff
          if (attempt < maxRetries) {
            const retryAfter = response.headers.get('retry-after');
            let delay;
            
            if (retryAfter) {
              // Use server-recommended retry time if available
              delay = parseInt(retryAfter) * 1000;
            } else {
              // Exponential backoff with jitter: 1s, 2s, 4s, 8s, 16s
              delay = Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 30000);
            }
            
            console.log(`Rate limit hit. Retrying in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
            await new Promise(resolve => setTimeout(resolve, delay));
            continue;
          } else {
            throw new Error(`${provider} rate limit exceeded. Please try again later.`);
          }
        }
        
        if (response.status === 402) {
          throw new Error('Payment required. Please add credits to your account.');
        }
        
        const errorText = await response.text();
        throw new Error(`${provider} API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      console.log(`Received raw response from ${provider}:`, JSON.stringify(data, null, 2));
      
      // Check if the response has the expected structure
      if (!data.choices || !data.choices[0]) {
        console.error(`Invalid response structure from ${provider}:`, data);
        throw new Error(`Invalid response structure from ${provider} API`);
      }
      
      // Log the message content specifically
      const messageContent = data.choices[0].message?.content;
      console.log(`Message content from ${provider}:`, messageContent);
      
      if (messageContent === undefined || messageContent === null) {
        console.error(`No message content in response from ${provider}:`, data);
        throw new Error(`No message content in response from ${provider} API`);
      }
      
      if (typeof messageContent !== 'string') {
        console.error(`Message content is not a string from ${provider}:`, typeof messageContent, messageContent);
        throw new Error(`Message content is not a string from ${provider} API`);
      }
      
      if (messageContent.trim() === '') {
        console.warn(`Empty message content from ${provider}:`, data);
        // This might be valid for some models, but let's log it
      }
      
      return data;

    } catch (error) {
      lastError = error;
      console.error(`Error calling ${provider} API (attempt ${attempt + 1}):`, error.message);
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        throw error;
      }
      
      // For network errors, continue retrying
      if (error instanceof TypeError || error.message.includes('fetch')) {
        const delay = Math.min(Math.pow(2, attempt) * 1000 + Math.random() * 1000, 30000);
        console.log(`Network error. Retrying in ${Math.round(delay)}ms... (attempt ${attempt + 1}/${maxRetries + 1})`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }
      
      // For rate limit errors, continue retrying
      if (error.message.includes('rate limit')) {
        continue;
      }
      
      // For other errors, re-throw immediately
      throw error;
    }
  }
  
  // If we've exhausted retries, throw the last error
  throw lastError || new Error('Unknown error occurred');
}

// Chat endpoint
app.post('/api/chat', async (req, res) => {
  try {
    const { messages, provider = 'openrouter', userId = 'anonymous' } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    console.log('Processing chat request with', messages.length, 'messages using provider:', provider, 'for user:', userId);
    
    // Check if user has exceeded token limit
    if (hasExceededTokenLimit(userId)) {
      return res.status(402).json({ 
        error: 'Payment required. You have exceeded your token limit.',
        paymentRequired: true,
        currentPlan: getUserEntitlements(userId)
      });
    }
    
    // Call API with retry logic
    const apiResponse = await callOpenAIWithRetry(messages, 5, provider);
    
    // Estimate token usage (simplified for this POC)
    const inputTokens = messages.reduce((total, msg) => total + (msg.content?.length || 0), 0);
    const outputTokens = apiResponse.choices[0]?.message?.content?.length || 0;
    const totalTokens = inputTokens + outputTokens;
    
    // Update user token usage
    const entitlements = updateUserTokenUsage(userId, totalTokens);
    
    console.log('Successfully received response from API');
    
    // Return the full API response along with token info
    res.json({
      ...apiResponse,
      tokenInfo: {
        used: totalTokens,
        totalUsage: entitlements.tokenUsage,
        limit: entitlements.tokenLimit,
        remaining: entitlements.tokenLimit - entitlements.tokenUsage
      }
    });
    
  } catch (error) {
    console.error('Error processing chat request:', error.message);
    
    // Handle specific error types
    if (error.message.includes('API key')) {
      res.status(500).json({ error: 'Server configuration error: ' + error.message });
    } else if (error.message.includes('rate limit') || error.message.includes('Rate limit')) {
      res.status(429).json({ error: error.message });
    } else if (error.message.includes('Payment required')) {
      res.status(402).json({ error: error.message });
    } else {
      // Extract error message from various error formats
      const errorMessage = error.message || error.toString() || 'Unknown error occurred';
      res.status(500).json({ error: 'Failed to process request: ' + errorMessage });
    }
  }
});

// Create payment order endpoint
app.post('/api/payment/order', async (req, res) => {
  try {
    const { userId, plan } = req.body;
    
    if (!userId || !plan) {
      return res.status(400).json({ error: 'userId and plan are required' });
    }
    
    if (!PLANS[plan]) {
      return res.status(400).json({ error: 'Invalid plan' });
    }
    
    if (!razorpayInstance) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    
    // Create payment transaction
    const transaction = createPaymentTransaction(userId, plan);
    
    // Create Razorpay order
    const options = {
      amount: PLANS[plan].price * 100, // Amount in paise
      currency: "INR",
      receipt: transaction.id,
      payment_capture: 1
    };
    
    const order = await razorpayInstance.orders.create(options);
    
    res.json({
      orderId: order.id,
      transactionId: transaction.id,
      amount: order.amount,
      currency: order.currency
    });
    
  } catch (error) {
    console.error('Error creating payment order:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Verify payment endpoint
app.post('/api/payment/verify', async (req, res) => {
  try {
    const { userId, plan, transactionId, razorpayPaymentId, razorpayOrderId, razorpaySignature } = req.body;
    
    if (!userId || !plan || !transactionId || !razorpayPaymentId || !razorpayOrderId || !razorpaySignature) {
      return res.status(400).json({ error: 'Missing required parameters' });
    }
    
    if (!razorpayInstance) {
      return res.status(500).json({ error: 'Payment system not configured' });
    }
    
    // Verify payment signature (in a real implementation)
    // For this POC, we'll assume payment is successful
    
    // Update transaction status
    updatePaymentTransactionStatus(transactionId, 'completed');
    
    // Upgrade user plan
    upgradeUserPlan(userId, plan);
    
    // Get updated entitlements
    const entitlements = getUserEntitlements(userId);
    
    res.json({
      success: true,
      message: 'Payment verified successfully',
      entitlements
    });
    
  } catch (error) {
    console.error('Error verifying payment:', error);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// Get user entitlements endpoint
app.get('/api/user/:userId/entitlements', (req, res) => {
  try {
    const { userId } = req.params;
    const entitlements = getUserEntitlements(userId);
    res.json(entitlements);
  } catch (error) {
    console.error('Error fetching user entitlements:', error);
    res.status(500).json({ error: 'Failed to fetch user entitlements' });
  }
});

// Get user transactions endpoint
app.get('/api/user/:userId/transactions', (req, res) => {
  try {
    const { userId } = req.params;
    const transactions = Object.values(paymentTransactions).filter(t => t.userId === userId);
    res.json(transactions);
  } catch (error) {
    console.error('Error fetching user transactions:', error);
    res.status(500).json({ error: 'Failed to fetch user transactions' });
  }
});

// Simple test endpoint
app.get('/api/test', (req, res) => {
  res.json({ message: 'Proxy server is running!' });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Chat endpoint available at http://localhost:${PORT}/api/chat`);
  console.log(`Test endpoint available at http://localhost:${PORT}/api/test`);
});