# Multi-Tile Chat POC Deployment Guide

## Project Overview

This is a full-stack web application featuring 4 independent chat interfaces powered by GPT-5 Nano API. Each tile represents a separate chat session with its own history stored in Firebase Firestore.

## Tech Stack

### Frontend
- React + TypeScript
- Tailwind CSS
- Vite
- shadcn/ui components
- Framer Motion for animations

### Backend
- Firebase (Firestore Database & Cloud Messaging)
- Firebase Cloud Messaging (Push Notifications)
- OpenAI GPT-5 Nano API (for AI responses)

## Environment Variables

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
VITE_FIREBASE_API_KEY=your_firebase_api_key
VITE_FIREBASE_AUTH_DOMAIN=your_firebase_auth_domain
VITE_FIREBASE_PROJECT_ID=your_firebase_project_id
VITE_FIREBASE_STORAGE_BUCKET=your_firebase_storage_bucket
VITE_FIREBASE_MESSAGING_SENDER_ID=your_firebase_messaging_sender_id
VITE_FIREBASE_APP_ID=your_firebase_app_id
VITE_FIREBASE_MEASUREMENT_ID=your_firebase_measurement_id
VITE_FIREBASE_VAPID_KEY=your_firebase_vapid_key

# OpenAI API Key (for GPT-5 Nano)
OPENAI_API_KEY=your_openai_api_key
```

## Deployment Instructions

### Frontend (Vercel)

1. Push your code to a GitHub repository
2. Create a new project on Vercel
3. Connect your GitHub repository
4. Set the following environment variables in Vercel:
   - All the `VITE_*` variables from your `.env` file
   - The `OPENAI_API_KEY` variable
5. Set the build command to `npm run build`
6. Set the output directory to `dist`
7. Deploy!

### Backend (Firebase)

1. Create a Firebase project
2. Enable Firestore Database in the Firebase console
3. Set up Firebase Cloud Messaging for push notifications
4. Add the Firebase configuration to your `.env` file

## Database Schema

The application uses a single `chats` collection in Firestore with the following structure:

```
chats (collection)
├── documentId (auto-generated)
│   ├── tile_id (string)
│   ├── session_id (string)
│   ├── role (string: "user" or "assistant")
│   ├── message (string)
│   ├── timestamp (Firebase Timestamp)
│   └── created_at (Firebase Timestamp)
```

## API Endpoints

### POST /api/chat (Client-side Function)

This endpoint handles chat messages for all 4 tiles. It accepts user input and:

1. Validates the request parameters
2. Saves the user message to Firestore
3. Retrieves conversation history
4. Calls the OpenAI GPT-5 Nano API for AI responses
5. Saves the AI response to Firestore
6. Returns the AI response to the client

Features:
- ✅ Each tile opens its own chat with GPT-5 Nano responses  
- ✅ Real-time message updates across all tiles
- ✅ Session-based conversation history
- ✅ Responsive UI with smooth animations
- ✅ Push notifications via Firebase

### Support

For issues with this implementation, please check the browser console and Firestore logs for detailed error messages.