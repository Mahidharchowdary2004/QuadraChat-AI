import dotenv from 'dotenv';
import express from 'express';
import rateLimit from 'express-rate-limit';
import fetch from 'node-fetch';
import path from 'path';

dotenv.config({ path: '.env.server' });

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(express.json());

// Rate limiting - 1 request per 10 seconds per IP
const limiter = rateLimit({
  windowMs: 10 * 1000, // 10 seconds
  max: 1, // limit each IP to 1 request per windowMs
  message: {
    error: 'Rate limit exceeded. Please wait before sending another request.'
  },
  standardHeaders: true, // Return rate limit info in the `RateLimit-*` headers
  legacyHeaders: false, // Disable the `X-RateLimit-*` headers
});

// Apply rate limiting to the chat endpoint
app.use('/api/chat', limiter);

// Function to call OpenAI API with exponential backoff
async function callOpenAIWithRetry(messages, maxRetries = 5) {
  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key is not configured');
  }

  let lastError = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempting to call OpenAI API (attempt ${attempt + 1}/${maxRetries + 1})`);
      
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENAI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini', // Using gpt-4o-mini as default
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
            throw new Error('OpenAI rate limit exceeded. Please try again later.');
          }
        }
        
        if (response.status === 402) {
          throw new Error('Payment required. Please add credits to your OpenAI account.');
        }
        
        const errorText = await response.text();
        throw new Error(`OpenAI API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();
      return data;

    } catch (error) {
      lastError = error;
      console.error(`Error calling OpenAI API (attempt ${attempt + 1}):`, error.message);
      
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
    const { messages } = req.body;
    
    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: 'Messages array is required' });
    }
    
    console.log('Processing chat request with', messages.length, 'messages');
    
    // Call OpenAI API with retry logic
    const openaiResponse = await callOpenAIWithRetry(messages);
    
    console.log('Successfully received response from OpenAI API');
    
    // Return the full OpenAI response
    res.json(openaiResponse);
    
  } catch (error) {
    console.error('Error processing chat request:', error.message);
    
    // Handle specific error types
    if (error.message.includes('API key')) {
      res.status(500).json({ error: 'Server configuration error: ' + error.message });
    } else if (error.message.includes('rate limit')) {
      res.status(429).json({ error: error.message });
    } else if (error.message.includes('Payment required')) {
      res.status(402).json({ error: error.message });
    } else {
      res.status(500).json({ error: 'Failed to process request: ' + error.message });
    }
  }
});

// Serve static files from the React app build directory
app.use(express.static(path.join(process.cwd(), 'dist')));

// The "catchall" handler: for any request that doesn't
// match one above, send back React's index.html file.
app.get('*', (req, res) => {
  res.sendFile(path.join(process.cwd(), 'dist/index.html'));
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
  console.log(`Chat endpoint available at http://localhost:${PORT}/api/chat`);
});