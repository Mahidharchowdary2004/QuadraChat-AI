# Deployment Instructions

## Environment Variable Configuration

This application uses separate environment variables for frontend and backend to ensure security:

### Frontend Environment Variables (.env in frontend directory)
Contains only variables that are safe to expose to the browser:
- Firebase configuration (for push notifications)
- Supabase configuration (for database access)

**DO NOT** add API keys or secrets to this file as they will be exposed to the browser.

### Backend Environment Variables (.env in backend directory)
Contains sensitive variables that should never be exposed to the browser:
- OpenRouter API keys
- Razorpay keys
- Other backend secrets

## Setup Instructions

### 1. Frontend Setup
1. Navigate to the `frontend` directory
2. Ensure your `.env` file contains only frontend-safe variables:
   ```
   # Firebase Configuration (for push notifications only)
   VITE_FIREBASE_API_KEY=your_firebase_api_key
   VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
   # ... other Firebase config
   
   # Supabase Configuration
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_KEY=your_supabase_key
   ```

### 2. Backend Setup
1. Navigate to the `backend` directory
2. Create or update your `.env` file with backend-only variables:
   ```
   # OpenAI API Keys
   OPENROUTER_API_KEY=your_openrouter_api_key_here
   OPENAI_GPT5_NANO_KEY=your_gpt5_nano_key_here
   
   # Razorpay Configuration
   RAZORPAY_KEY_ID=your_razorpay_key_id
   RAZORPAY_KEY_SECRET=your_razorpay_key_secret
   ```

### 3. Deploying to Render
1. In your Render dashboard, go to your backend service
2. In the "Environment" section, add the following variables:
   - `OPENROUTER_API_KEY` = your actual OpenRouter API key
   - `OPENAI_GPT5_NANO_KEY` = your actual GPT-5 Nano key
   - `RAZORPAY_KEY_ID` = your actual Razorpay key ID
   - `RAZORPAY_KEY_SECRET` = your actual Razorpay key secret

3. Do NOT add any VITE_ prefixed variables to Render as they should only be in the frontend.

## Security Notes

- Never commit actual API keys to version control
- Always use environment variables for sensitive data
- Variables prefixed with `VITE_` are exposed to the browser and should only contain non-sensitive data
- Backend variables without `VITE_` prefix are server-only and safe for secrets

## Testing Your Setup

To verify your API keys are working correctly:

1. Test locally:
   ```bash
   curl https://openrouter.ai/api/v1/models \
     -H "Authorization: Bearer YOUR_KEY_HERE"
   ```

2. If it returns a list of models, your key works fine
3. If it says "User not found", the key was exposed and revoked by OpenRouter