import { Worker, Job } from 'bullmq';
import nodemailer from 'nodemailer';
import { redis } from '../config/redis';
import { getSMTPTransporter } from '../config/smtp';
import { prisma } from '../config/database';
import {
  canSendEmail,
  incrementRateLimit,
  getDelayBeforeNextEmail,
  calculateScheduledTime,
} from '../services/rateLimitService';

interface EmailJobData {
  emailId: string;
  recipientEmail: string;
  subject: string;
  body: string;
  senderEmail: string;
  userId: string;
}

const WORKER_CONCURRENCY = parseInt(process.env.WORKER_CONCURRENCY || '5');
const MIN_DELAY_BETWEEN_EMAILS_MS = parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || '2000');

export const emailWorker = new Worker<EmailJobData>(
  'email-queue',
  async (job: Job<EmailJobData>) => {
    const { emailId, recipientEmail, subject, body, senderEmail, userId } = job.data;

    console.log(`📧 Processing email job ${job.id} for ${recipientEmail}`);

    try {
      // Update status to PROCESSING
      await prisma.email.update({
        where: { id: emailId },
        data: { status: 'PROCESSING' },
      });

      // Check rate limit before sending
      const rateLimitCheck = await canSendEmail(senderEmail);
      
      if (!rateLimitCheck.canSend) {
        // Reschedule for next available window
        const nextWindow = rateLimitCheck.nextAvailableWindow || new Date(Date.now() + 3600000);
        const delay = nextWindow.getTime() - Date.now();

        console.log(`⏸️  Rate limit reached for ${senderEmail}, rescheduling for ${nextWindow.toISOString()}`);

        await prisma.email.update({
          where: { id: emailId },
          data: { status: 'RATE_LIMITED' },
        });

        // Reschedule job
        await job.moveToDelayed(delay);
        return { status: 'rate_limited', rescheduledFor: nextWindow };
      }

      // Get SMTP transporter
      const transporter = await getSMTPTransporter();

      // Send email
      const info = await transporter.sendMail({
        from: senderEmail || 'noreply@example.com',
        to: recipientEmail,
        subject,
        html: body,
      });

      // Increment rate limit counter
      await incrementRateLimit(senderEmail);

      // Update email status
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'SENT',
          sentAt: new Date(),
          senderEmail,
        },
      });

      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log(`✅ Email sent to ${recipientEmail}. Preview URL: ${previewUrl}`);
        console.log(`⚠️  Note: If using Ethereal Email, check the preview URL above to view the email (it's not delivered to real addresses)`);
      } else {
        console.log(`✅ Email sent to ${recipientEmail} (real SMTP provider)`);
      }

      // Add delay before next email (to respect minimum delay)
      await new Promise((resolve) => setTimeout(resolve, MIN_DELAY_BETWEEN_EMAILS_MS));

      return { status: 'sent', messageId: info.messageId };
    } catch (error: any) {
      console.error(`❌ Error sending email to ${recipientEmail}:`, error);

      // Update email status
      await prisma.email.update({
        where: { id: emailId },
        data: {
          status: 'FAILED',
          errorMessage: error.message || 'Unknown error',
        },
      });

      throw error;
    }
  },
  {
    connection: redis,
    concurrency: WORKER_CONCURRENCY,
    limiter: {
      max: 1, // Process one job at a time per worker instance
      duration: MIN_DELAY_BETWEEN_EMAILS_MS,
    },
  }
);

emailWorker.on('completed', (job) => {
  console.log(`✅ Job ${job.id} completed`);
});

emailWorker.on('failed', (job, err) => {
  console.error(`❌ Job ${job?.id} failed:`, err);
});

emailWorker.on('error', (err) => {
  console.error('Worker error:', err);
});

