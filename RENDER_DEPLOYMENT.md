# Render Deployment Guide for Quadra Chatbox

This guide provides detailed instructions for deploying the Quadra Chatbox application on Render, addressing common issues that can cause deployment failures.

## Understanding the Monorepo Structure

This project uses a monorepo structure with separate frontend and backend directories:
- `frontend/` - React + Vite application
- `backend/` - Express.js API server

## Common Deployment Issues and Solutions

### 1. Build Command Failures

**Problem**: Render fails with "Missing script: build" when running `npm install; npm run build`

**Root Cause**: Render's default build command uses semicolon-separated commands which can fail in some environments.

**Solution**: Use one of the following approaches:

#### Option A: Configure Render Dashboard (Recommended)
1. In your Render dashboard, create a new Web Service
2. Connect your GitHub repository
3. Set the "Root Directory" to `frontend` (this treats the frontend directory as the project root)
4. Set the "Build Command" to: `npm install && npm run build`
5. Set the "Start Command" to: `npm run preview`

#### Option B: Use Custom Build Script
1. In your Render dashboard, create a new Web Service
2. Connect your GitHub repository
3. Leave the "Root Directory" as default (repository root)
4. Set the "Build Command" to: `npm run build`
5. Set the "Start Command" to: `cd frontend && npm run preview`

### 2. Environment Variable Configuration

#### Frontend Variables (VITE_ prefixed)
These should be configured in Render for the frontend service:
- `VITE_SUPABASE_URL` - Your Supabase project URL
- `VITE_SUPABASE_KEY` - Your Supabase anon key
- `VITE_FIREBASE_API_KEY` - Your Firebase API key (for notifications)
- Other VITE_ prefixed variables as needed

#### Backend Variables (No VITE_ prefix)
These should be configured in Render for the backend service:
- `OPENROUTER_API_KEY` - Your OpenRouter API key
- `OPENAI_GPT5_NANO_KEY` - Your GPT-5 Nano key
- `RAZORPAY_KEY_ID` - Your Razorpay key ID
- `RAZORPAY_KEY_SECRET` - Your Razorpay key secret

### 3. Backend Deployment

1. In your Render dashboard, create a new Web Service for the backend
2. Connect your GitHub repository
3. Set the "Root Directory" to `backend`
4. Set the "Build Command" to: `npm install`
5. Set the "Start Command" to: `npm run start`

## Step-by-Step Deployment

### Frontend Deployment

1. Go to your Render dashboard
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - Name: `quadra-chatbox-frontend`
   - Region: Choose your preferred region
   - Branch: `main`
   - Root Directory: `frontend`
   - Build Command: `npm install && npm run build`
   - Start Command: `npm run preview`
5. Add environment variables:
   - All VITE_ prefixed variables from your frontend .env file
6. Click "Create Web Service"

### Backend Deployment

1. Go to your Render dashboard
2. Click "New +" and select "Web Service"
3. Connect your GitHub repository
4. Configure the service:
   - Name: `quadra-chatbox-backend`
   - Region: Choose your preferred region
   - Branch: `main`
   - Root Directory: `backend`
   - Build Command: `npm install`
   - Start Command: `npm run start`
5. Add environment variables:
   - `OPENROUTER_API_KEY` = your OpenRouter API key
   - `OPENAI_GPT5_NANO_KEY` = your GPT-5 Nano key
   - `RAZORPAY_KEY_ID` = your Razorpay key ID
   - `RAZORPAY_KEY_SECRET` = your Razorpay key secret
6. Click "Create Web Service"

## Troubleshooting

### Build Issues

If you encounter build issues:

1. Check that your build command uses `&&` instead of `;` to separate commands
2. Ensure the correct directory structure is maintained
3. Verify that all dependencies are properly installed

### Runtime Issues

If the application fails at runtime:

1. Check environment variables are correctly configured
2. Verify API keys are valid and not revoked
3. Check the application logs in Render for specific error messages

### API Key Validation

To test if your API keys are working:

```bash
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer YOUR_OPENROUTER_KEY_HERE"
```

If it returns a list of models, your key works fine.
If it says "User not found", the key was exposed and revoked by OpenRouter.

## Important Notes

1. Never commit actual API keys to version control
2. Variables prefixed with `VITE_` are exposed to the browser and should only contain non-sensitive data
3. Backend variables without `VITE_` prefix are server-only and safe for secrets
4. The frontend should proxy API requests to the deployed backend URL, not localhost