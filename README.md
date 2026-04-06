# SafeSpace — AI Therapist System

A fully autonomous AI therapy platform with emotion-aware, personality-driven conversations.

## Features

- **Multi-Personality Therapist**: Adapts tone based on detected emotion
  - Compassionate (sadness, distress)
  - Motivational (low confidence)
  - Understanding (venting, confusion)
  - Brutal Truth (denial, harmful thinking)
- **Emotion Detection**: Real-time classification of user emotional state
- **Memory System**: Maintains conversation context and emotion trends
- **Safety Layer**: Crisis detection with automatic helpline resources
- **Real-Time Chat**: Socket.io powered instant messaging

## Tech Stack

- **Backend**: Node.js, Express, Socket.io
- **Database**: MongoDB (chat history, memory), Redis (sessions)
- **AI**: Google Gemini API
- **Frontend**: React

## Quick Start

### Prerequisites

- Node.js 18+
- MongoDB
- Redis
- Gemini API Key

### Installation

```bash
# Clone and setup
git clone <repo-url>
cd mental-bot

# Backend
cd server
cp ../.env.example .env
# Edit .env with your values
npm install
npm run dev

# Frontend (new terminal)
cd client
npm install
npm start
```

### Environment Variables

Copy `.env.example` to `server/.env` and configure:

| Variable         | Description               |
| ---------------- | ------------------------- |
| `MONGODB_URI`    | MongoDB connection string |
| `REDIS_URL`      | Redis connection string   |
| `JWT_SECRET`     | Secret for JWT signing    |
| `GEMINI_API_KEY` | Google Gemini API key     |

## API Endpoints

| Method | Endpoint              | Description        |
| ------ | --------------------- | ------------------ |
| POST   | `/api/auth/register`  | Register user      |
| POST   | `/api/auth/login`     | Login user         |
| POST   | `/api/chat`           | Send message to AI |
| GET    | `/api/chat/history`   | Get chat history   |
| GET    | `/api/emotion/trends` | Get emotion trends |

## Architecture

```
User Input → Emotion Detection → Personality Selection → Memory Injection → LLM → Response
```

## Safety

The system includes a safety layer that:

- Detects self-harm and suicide-related content
- Overrides normal responses with crisis-safe messaging
- Provides emergency helpline resources

## License

MIT
