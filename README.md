# SafeSpace

SafeSpace is a mental-wellness platform with an AI companion, anonymous forum spaces, and a calm dark-themed interface.

## Features

- AI chat with emotion-aware personality switching
- Anonymous forum posts and comments
- Subspaces with live post counts
- Safety-focused messaging for crisis content
- Socket-based real-time chat updates

## Project structure

- `client/` — React frontend
- `server/` — Express + Socket.io API
- `vercel.json` — Vercel routing/build configuration

## Local development

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- Gemini/OpenRouter API key, if enabled in your backend config

### Backend

```bash
cd server
cp ../.env.example .env
npm install
npm run dev
```

### Frontend

```bash
cd client
npm install
npm start
```

## Environment variables

Create `server/.env` from `.env.example` and set the required values. Common variables include:

| Variable               | Description                 |
| ---------------------- | --------------------------- |
| `MONGODB_URI`          | MongoDB connection string   |
| `REDIS_URL`            | Redis connection string     |
| `JWT_SECRET`           | Secret used for auth tokens |
| `GEMINI_API_KEY`       | Gemini API key              |
| `OPENROUTER_API_KEY`   | OpenRouter key, if used     |
| `RATE_LIMIT_WINDOW_MS` | Rate-limit window in ms     |
| `RATE_LIMIT_MAX`       | Maximum requests per window |

## Vercel deployment

This repo is already configured for Vercel:

- Frontend builds from `client/`
- Serverless API routes point to `server/src/index.js`
- SPA routes like `/login`, `/signup`, `/chat`, and `/forum` all resolve to the React app

### Deploy steps

1. Import the repository into Vercel.
2. Set the project root to the repository root.
3. Confirm the build uses the included `vercel.json`.
4. Add production environment variables in the Vercel dashboard.
5. Deploy.

### Notes

- Keep secrets out of git; use Vercel env vars and local `.env` files.
- If you change API routes, update `vercel.json` accordingly.

## API overview

- `/api/auth/register`
- `/api/auth/login`
- `/api/chat`
- `/api/forum/*`

## Safety

The backend includes crisis-aware safeguards and resource guidance for self-harm or suicide-related content.
