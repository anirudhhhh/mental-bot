# SafeSpace Deployment Guide

## Vercel Deployment

### Prerequisites

1. Vercel account
2. MongoDB Atlas database
3. Google Gemini API key

### Steps

1. **Install Vercel CLI**

```bash
npm install -g vercel
```

2. **Login to Vercel**

```bash
vercel login
```

3. **Set Environment Variables in Vercel Dashboard**
   Go to Project Settings → Environment Variables and add:

- `MONGODB_URI` - Your MongoDB Atlas connection string
- `JWT_SECRET` - Your JWT secret (64 chars)
- `GEMINI_API_KEY` - Your Google Gemini API key
- `NODE_ENV` - Set to `production`

4. **Deploy**

```bash
vercel
```

### Important Notes

**Socket.io Limitation on Vercel:**

- Vercel serverless functions don't support WebSocket connections properly
- Socket.io real-time chat **will not work** on Vercel

**Recommended Alternative Hosting:**

- **Railway** (supports WebSockets, easy deployment)
- **Render** (free tier, full WebSocket support)
- **Fly.io** (global deployment, WebSocket support)
- **DigitalOcean App Platform**

### Deploy to Railway (Recommended)

1. Push code to GitHub
2. Go to railway.app
3. Create new project → Deploy from GitHub
4. Add environment variables
5. Deploy!

Railway automatically detects Node.js and builds both server and client.

### Environment Variables for Production

```env
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your-secret-here
GEMINI_API_KEY=your-api-key
NODE_ENV=production
PORT=5001
```

### Client Configuration

Update API URLs in production:

- `/client/src/contexts/AuthContext.js` - Change `API_URL`
- `/client/src/components/Chat.js` - Update Socket.io URL
- `/client/src/components/Forum.js` - Change `API_URL`

Or use environment variables:

```js
const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5001/api";
```
