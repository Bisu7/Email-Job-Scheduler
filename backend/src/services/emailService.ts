import { prisma } from '../config/database';
import { emailQueue } from '../queue/emailQueue';
import { calculateScheduledTime } from './rateLimitService';

interface ScheduleEmailParams {
  userId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  scheduledFor: Date;
  senderEmail: string;
  emailIndex?: number;
}

/**
 * Schedule a single email
 */
export async function scheduleEmail(params: ScheduleEmailParams) {
  const { userId, recipientEmail, subject, body, scheduledFor, senderEmail, emailIndex = 0 } = params;

  // Calculate actual scheduled time considering rate limits
  const actualScheduledTime = await calculateScheduledTime(senderEmail, scheduledFor, emailIndex);
  const delay = Math.max(0, actualScheduledTime.getTime() - Date.now());

  // Create email record in DB
  const email = await prisma.email.create({
    data: {
      userId,
      recipientEmail,
      subject,
      body,
      scheduledFor: actualScheduledTime,
      status: 'SCHEDULED',
      senderEmail,
    },
  });

  // Add job to queue with delay
  const job = await emailQueue.add(
    'send-email',
    {
      emailId: email.id,
      recipientEmail,
      subject,
      body,
      senderEmail,
      userId,
    },
    {
      delay,
      jobId: email.id, // Use email ID as job ID for idempotency
    }
  );

  // Update email with job ID
  await prisma.email.update({
    where: { id: email.id },
    data: { jobId: job.id },
  });

  return email;
}

/**
 * Schedule multiple emails from CSV
 */
export async function scheduleBulkEmails(params: {
  userId: string;
  recipientEmails: string[];
  subject: string;
  body: string;
  startTime: Date;
  delayBetweenEmails: number;
  hourlyLimit: number;
  senderEmail: string;
}) {
  const {
    userId,
    recipientEmails,
    subject,
    body,
    startTime,
    delayBetweenEmails,
    hourlyLimit,
    senderEmail,
  } = params;

  const scheduledEmails = [];
  let currentTime = new Date(startTime);

  for (let i = 0; i < recipientEmails.length; i++) {
    const email = await scheduleEmail({
      userId,
      recipientEmail: recipientEmails[i],
      subject,
      body,
      scheduledFor: new Date(currentTime),
      senderEmail,
      emailIndex: i,
    });

    scheduledEmails.push(email);

    // Increment time by delay
    currentTime = new Date(currentTime.getTime() + delayBetweenEmails);
  }

  return scheduledEmails;
}

/**
 * Get scheduled emails for user
 */
export async function getScheduledEmails(userId: string) {
  return prisma.email.findMany({
    where: {
      userId,
      status: {
        in: ['SCHEDULED', 'PROCESSING', 'RATE_LIMITED'],
      },
    },
    orderBy: {
      scheduledFor: 'asc',
    },
  });
}

/**
 * Get sent emails for user
 */
export async function getSentEmails(userId: string) {
  return prisma.email.findMany({
    where: {
      userId,
      status: {
        in: ['SENT', 'FAILED'],
      },
    },
    orderBy: {
      sentAt: 'desc',
    },
  });
}

/**
 * Get email by ID
 */
export async function getEmailById(emailId: string, userId: string) {
  return prisma.email.findFirst({
    where: {
      id: emailId,
      userId,
    },
  });
}

