# OpenAI Proxy Server

A lightweight Node.js + Express backend that proxies requests to multiple AI providers with rate limiting and retry logic.

## Features

- Single endpoint `/api/chat` for processing chat messages
- Support for multiple AI providers:
  - OpenRouter
  - OpenAI GPT-5 Nano
- Rate limiting (1 request per 10 seconds per IP)
- Exponential backoff retry logic for 429 errors
- Secure API key management with dotenv
- Error handling for various API responses
- Full API response returned to frontend

## Setup

1. Create a `.env.server` file based on `.env.example`:
   ```
   OPENROUTER_API_KEY=sk-or-v1-your_openrouter_api_key_here
   OPENAI_GPT5_NANO_KEY=sk-or-v1-your_gpt5_nano_key_here
   PORT=3001
   ```

2. Install dependencies:
   ```bash
   npm install
   ```

3. Start the server:
   ```bash
   npm start
   ```

   For development with auto-restart:
   ```bash
   npm run dev
   ```

## API Endpoint

### POST /api/chat

**Request Body:**
```json
{
  "messages": [
    {"role": "system", "content": "You are a helpful assistant."},
    {"role": "user", "content": "Hello!"}
  ],
  "provider": "openrouter" // Can be "openrouter" or "gpt5-nano"
}
```

**Response:**
Full API response as JSON.

## Provider Support

The proxy server supports multiple AI providers:

| Provider | Key in .env.server | Value in request |
|----------|-------------------|------------------|
| OpenRouter | OPENROUTER_API_KEY | "openrouter" |
| OpenAI GPT-5 Nano | OPENAI_GPT5_NANO_KEY | "gpt5-nano" |

## Rate Limiting

- Each IP address is limited to 1 request per 10 seconds
- Exceeding the limit returns a 429 status with error message

## Retry Logic

- Automatically retries on 429 "Too Many Requests" errors
- Exponential backoff with jitter (1s, 2s, 4s, 8s, 16s)
- Maximum 5 retry attempts
- Respects `retry-after` header if provided by the API

## Error Handling

The server handles various error conditions:
- Missing or invalid API key
- Payment required (402)
- Rate limit exceeded (429)
- Network issues
- Invalid responses

## Sample React Fetch Request

```javascript
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    messages: [
      { role: 'user', content: 'Hello!' }
    ],
    provider: 'openrouter' // Can be 'openrouter' or 'gpt5-nano'
  }),
});

if (!response.ok) {
  const error = await response.json();
  throw new Error(error.error);
}

const data = await response.json();
console.log(data.choices[0].message.content);
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| OPENROUTER_API_KEY | Your OpenRouter API key | Required |
| OPENAI_GPT5_NANO_KEY | Your OpenAI GPT-5 Nano key | Optional |
| PORT | Server port | 3001 |