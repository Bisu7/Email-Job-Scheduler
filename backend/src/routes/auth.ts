import express from 'express';
import { prisma } from '../config/database';
import jwt from 'jsonwebtoken';

const router = express.Router();

// Google OAuth callback (handled by frontend, backend just verifies token)
router.post('/verify', async (req, res) => {
  try {
    const { token, userInfo } = req.body;

    if (!token || !userInfo) {
      return res.status(400).json({ error: 'Token and user info required' });
    }

    // In production, verify Google token here
    // For now, we'll trust the frontend and create/update user

    const user = await prisma.user.upsert({
      where: { email: userInfo.email },
      update: {
        name: userInfo.name,
        avatar: userInfo.picture,
        googleId: userInfo.sub,
      },
      create: {
        email: userInfo.email,
        name: userInfo.name,
        avatar: userInfo.picture,
        googleId: userInfo.sub,
      },
    });

    // Generate JWT
    const jwtToken = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET || 'secret',
      { expiresIn: '7d' }
    );

    res.json({
      token: jwtToken,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        avatar: user.avatar,
      },
    });
  } catch (error: any) {
    console.error('Auth error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get current user
router.get('/me', async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'secret') as any;

    const user = await prisma.user.findUnique({
      where: { id: decoded.userId },
      select: {
        id: true,
        email: true,
        name: true,
        avatar: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error: any) {
    res.status(401).json({ error: 'Invalid token' });
  }
});

export { router as authRouter };

