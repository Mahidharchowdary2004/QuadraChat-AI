# Welcome to your AI Chat project

This is a full-stack web application featuring 4 independent chat interfaces powered by multiple AI providers. Each tile represents a separate chat session with its own history stored in Firebase Firestore.

## Tech Stack

- React + TypeScript
- Tailwind CSS
- Vite
- Firebase (Firestore Database & Cloud Messaging)
- Multiple AI Providers:
  - OpenRouter
  - OpenAI GPT-5 Nano
- Razorpay Payment Gateway

## Features

- 🧠 4 independent AI chat interfaces
- 💾 Conversation history stored in Firebase Firestore
- 🔔 Push notifications via Firebase
- 📱 Fully responsive design
- ⚡ Real-time updates with Firebase
- 🎨 Beautiful UI with shadcn/ui components
- 🔀 Switch between multiple AI providers
- 🛡️ Rate limiting and retry logic for API calls
- 💰 Token-based payment system with Razorpay integration

## Development

1. Clone this repo
2. Install dependencies with `npm install`
3. Create a `.env` file based on `.env.example`
4. Add your API keys for each provider you want to use
5. Configure Razorpay keys for payment processing
6. Run the development server with `npm run dev`

## Deployment

### Frontend

Simply deploy to any static hosting service like Vercel, Netlify, or GitHub Pages.

### Backend

1. Create a Firebase project
2. Enable Firestore Database in the Firebase console
3. Set up Firebase Cloud Messaging for push notifications
4. Add the Firebase configuration to your project
5. Add your API keys to the environment variables
6. Configure Razorpay keys for payment processing

## AI Provider Selection

You can switch between different AI providers in the chat interface:
- OpenRouter
- OpenAI GPT-5 Nano

Each provider requires its own API key in the environment configuration.

## Payment System

The application implements a token-based payment system:
- Free tier: 100k tokens
- College Pack: ₹99 for 500k tokens
- Lite Pack: ₹299 for 2M tokens
- Pro Pack: ₹599 for 10M tokens

When users exceed their token limit, they are prompted to upgrade their plan via Razorpay.

## Can I connect a custom domain to my project?

Yes! Most hosting providers offer custom domain configuration. Check their documentation for specific instructions.

## Contributing

Feel free to fork this repo and submit pull requests. For major changes, please open an issue first to discuss what you would like to change.