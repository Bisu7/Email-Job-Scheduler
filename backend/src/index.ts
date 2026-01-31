import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { emailRouter } from './routes/email';
import { authRouter } from './routes/auth';
import { emailQueue } from './queue/emailQueue';
import { emailWorker } from './workers/emailWorker';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());

// Root route
app.get('/', (req, res) => {
  res.json({ 
    message: 'Email Scheduler API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: '/api/auth',
      emails: '/api/emails'
    }
  });
});

// Routes
app.use('/api/auth', authRouter);
app.use('/api/emails', emailRouter);

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Email worker started with concurrency: ${process.env.WORKER_CONCURRENCY || 5}`);
});

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('SIGTERM received, shutting down gracefully...');
  await emailQueue.close();
  await emailWorker.close();
  process.exit(0);
});

