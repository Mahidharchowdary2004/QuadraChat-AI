import { v4 as uuidv4 } from 'uuid';

// Plan definitions
export const PLANS = {
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

// User entitlements interface
export interface UserEntitlements {
  userId: string;
  plan: keyof typeof PLANS;
  tokenUsage: number;
  tokenLimit: number;
  expiresAt: Date | null;
}

// Payment transaction interface
export interface PaymentTransaction {
  id: string;
  userId: string;
  plan: keyof typeof PLANS;
  amount: number;
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

// In-memory storage for user entitlements (in production, this would be in a database)
const userEntitlements: Record<string, UserEntitlements> = {};

// In-memory storage for payment transactions (in production, this would be in a database)
const paymentTransactions: Record<string, PaymentTransaction> = {};

/**
 * Get user entitlements
 * @param userId 
 * @returns User entitlements
 */
export const getUserEntitlements = (userId: string): UserEntitlements => {
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

/**
 * Update user token usage
 * @param userId 
 * @param tokens 
 * @returns Updated user entitlements
 */
export const updateUserTokenUsage = (userId: string, tokens: number): UserEntitlements => {
  const entitlements = getUserEntitlements(userId);
  entitlements.tokenUsage += tokens;
  
  // Check if user has exceeded their limit
  if (entitlements.tokenUsage >= entitlements.tokenLimit) {
    console.log(`User ${userId} has exceeded token limit: ${entitlements.tokenUsage}/${entitlements.tokenLimit}`);
  }
  
  return entitlements;
};

/**
 * Check if user has exceeded token limit
 * @param userId 
 * @returns boolean
 */
export const hasExceededTokenLimit = (userId: string): boolean => {
  const entitlements = getUserEntitlements(userId);
  return entitlements.tokenUsage >= entitlements.tokenLimit;
};

/**
 * Create a payment transaction
 * @param userId 
 * @param plan 
 * @returns Payment transaction
 */
export const createPaymentTransaction = (userId: string, plan: keyof typeof PLANS): PaymentTransaction => {
  const transactionId = uuidv4();
  const transaction: PaymentTransaction = {
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

/**
 * Update payment transaction status
 * @param transactionId 
 * @param status 
 * @returns Updated payment transaction
 */
export const updatePaymentTransactionStatus = (transactionId: string, status: 'completed' | 'failed'): PaymentTransaction | null => {
  if (!paymentTransactions[transactionId]) {
    return null;
  }
  
  paymentTransactions[transactionId].status = status;
  paymentTransactions[transactionId].updatedAt = new Date();
  
  return paymentTransactions[transactionId];
};

/**
 * Upgrade user plan
 * @param userId 
 * @param plan 
 * @returns Updated user entitlements
 */
export const upgradeUserPlan = (userId: string, plan: keyof typeof PLANS): UserEntitlements => {
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

/**
 * Get payment transaction
 * @param transactionId 
 * @returns Payment transaction
 */
export const getPaymentTransaction = (transactionId: string): PaymentTransaction | null => {
  return paymentTransactions[transactionId] || null;
};

/**
 * Get all user transactions
 * @param userId 
 * @returns Array of payment transactions
 */
export const getUserTransactions = (userId: string): PaymentTransaction[] => {
  return Object.values(paymentTransactions).filter(transaction => transaction.userId === userId);
};