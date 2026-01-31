import express from 'express';
import { scheduleBulkEmails, getScheduledEmails, getSentEmails } from '../services/emailService';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Middleware to verify JWT
const authenticate = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;
    (req as any).userId = decoded.userId;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Schedule bulk emails
router.post('/schedule', authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const { recipientEmails, subject, body, startTime, delayBetweenEmails, hourlyLimit, senderEmail } = req.body;

    if (!recipientEmails || !Array.isArray(recipientEmails) || recipientEmails.length === 0) {
      return res.status(400).json({ error: 'recipientEmails array is required' });
    }

    if (!subject || !body) {
      return res.status(400).json({ error: 'subject and body are required' });
    }

    if (!startTime) {
      return res.status(400).json({ error: 'startTime is required' });
    }

    const scheduledEmails = await scheduleBulkEmails({
      userId,
      recipientEmails,
      subject,
      body,
      startTime: new Date(startTime),
      delayBetweenEmails: delayBetweenEmails || 2000,
      hourlyLimit: hourlyLimit || 200,
      senderEmail: senderEmail || 'noreply@example.com',
    });

    res.json({
      message: `Scheduled ${scheduledEmails.length} emails`,
      count: scheduledEmails.length,
      emails: scheduledEmails,
    });
  } catch (error: any) {
    console.error('Schedule error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get scheduled emails
router.get('/scheduled', authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const emails = await getScheduledEmails(userId);
    res.json(emails);
  } catch (error: any) {
    console.error('Get scheduled emails error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get sent emails
router.get('/sent', authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    const emails = await getSentEmails(userId);
    res.json(emails);
  } catch (error: any) {
    console.error('Get sent emails error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get email stats
router.get('/stats', authenticate, async (req, res) => {
  try {
    const userId = (req as any).userId;
    
    const [scheduled, sent, failed] = await Promise.all([
      prisma.email.count({
        where: { userId, status: { in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'] } },
      }),
      prisma.email.count({
        where: { userId, status: 'SENT' },
      }),
      prisma.email.count({
        where: { userId, status: 'FAILED' },
      }),
    ]);

    res.json({ scheduled, sent, failed });
  } catch (error: any) {
    console.error('Get stats error:', error);
    res.status(500).json({ error: error.message });
  }
});

export { router as emailRouter };

