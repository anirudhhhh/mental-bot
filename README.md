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
- `render.yaml` — Render blueprint for the full stack

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

## Render deployment

This repo includes a `render.yaml` blueprint for:

- `safespace-server` as a Node web service
- `safespace-client` as a static site

### Deploy steps

1. Push the repository to GitHub.
2. In Render, create a new Blueprint and point it at this repo.
3. Render will read `render.yaml` and create both services.
4. Set the production environment variables in Render.
5. Update the client env values to point to the deployed server URL.

### Required production env values

- `NODE_ENV=production`
- `MONGODB_URI=<your MongoDB Atlas URI>`
- `JWT_SECRET=<strong random secret>`
- `OPENROUTER_API_KEY=<your API key>`
- `CLIENT_URL=<your Render static site URL>`
- `CORS_ORIGIN=<your Render static site URL>`
- `REACT_APP_API_URL=<your Render server URL>/api`
- `REACT_APP_SOCKET_URL=<your Render server URL>`

### Notes

- Keep secrets out of git; use Render env vars and local `.env` files.
- Render supports WebSockets on web services, so chat should work there.

## API overview

- `/api/auth/register`
- `/api/auth/login`
- `/api/chat`
- `/api/forum/*`

## Safety

The backend includes crisis-aware safeguards and resource guidance for self-harm or suicide-related content.
