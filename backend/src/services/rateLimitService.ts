import { prisma } from '../config/database';
import { redis } from '../config/redis';

const MAX_EMAILS_PER_HOUR = parseInt(process.env.MAX_EMAILS_PER_HOUR || '200');
const MIN_DELAY_BETWEEN_EMAILS_MS = parseInt(process.env.MIN_DELAY_BETWEEN_EMAILS_MS || '2000');

/**
 * Get the current hour window (truncated to the hour)
 */
function getHourWindow(date: Date = new Date()): Date {
  const window = new Date(date);
  window.setMinutes(0);
  window.setSeconds(0);
  window.setMilliseconds(0);
  return window;
}

/**
 * Get the next available hour window
 */
function getNextHourWindow(): Date {
  const now = new Date();
  const next = new Date(now);
  next.setHours(next.getHours() + 1);
  return getHourWindow(next);
}

/**
 * Check if sender can send more emails in current hour
 * Uses Redis for fast atomic operations across multiple workers
 */
export async function canSendEmail(senderEmail: string): Promise<{
  canSend: boolean;
  currentCount: number;
  nextAvailableWindow?: Date;
}> {
  const hourWindow = getHourWindow();
  const redisKey = `rate_limit:${senderEmail}:${hourWindow.getTime()}`;

  // Get current count from Redis (fast, atomic)
  const currentCount = await redis.get(redisKey);
  const count = currentCount ? parseInt(currentCount) : 0;

  if (count >= MAX_EMAILS_PER_HOUR) {
    return {
      canSend: false,
      currentCount: count,
      nextAvailableWindow: getNextHourWindow(),
    };
  }

  return {
    canSend: true,
    currentCount: count,
  };
}

/**
 * Increment rate limit counter for sender
 * Updates both Redis (for fast checks) and DB (for persistence)
 */
export async function incrementRateLimit(senderEmail: string): Promise<void> {
  const hourWindow = getHourWindow();
  const redisKey = `rate_limit:${senderEmail}:${hourWindow.getTime()}`;

  // Increment Redis counter (atomic operation)
  const newCount = await redis.incr(redisKey);
  await redis.expire(redisKey, 3600); // Expire after 1 hour

  // Also update DB for persistence (async, don't block)
  prisma.rateLimit
    .upsert({
      where: {
        senderEmail_hourWindow: {
          senderEmail,
          hourWindow,
        },
      },
      update: {
        emailCount: newCount,
      },
      create: {
        senderEmail,
        hourWindow,
        emailCount: newCount,
      },
    })
    .catch((err : any) => {
      console.error('Error updating rate limit in DB:', err);
    });
}

/**
 * Calculate delay before next email can be sent
 * Ensures minimum delay between emails
 */
export function getDelayBeforeNextEmail(): number {
  return MIN_DELAY_BETWEEN_EMAILS_MS;
}

/**
 * Calculate when email should be scheduled considering:
 * 1. Rate limits (hourly)
 * 2. Minimum delay between emails
 * 3. Current time
 */
export async function calculateScheduledTime(
  senderEmail: string,
  requestedTime: Date,
  emailIndex: number = 0
): Promise<Date> {
  const now = new Date();
  const requested = new Date(requestedTime);

  // Start from requested time or now, whichever is later
  let scheduledTime = requested > now ? requested : new Date(now);

  // Add minimum delay for each email (staggered sending)
  scheduledTime = new Date(scheduledTime.getTime() + emailIndex * MIN_DELAY_BETWEEN_EMAILS_MS);

  // Check rate limits
  const rateLimitCheck = await canSendEmail(senderEmail);
  
  if (!rateLimitCheck.canSend && rateLimitCheck.nextAvailableWindow) {
    // If current hour is full, schedule for next hour
    const nextWindow = rateLimitCheck.nextAvailableWindow;
    if (scheduledTime < nextWindow) {
      scheduledTime = new Date(nextWindow);
      // Add delay offset within the new hour
      scheduledTime = new Date(scheduledTime.getTime() + emailIndex * MIN_DELAY_BETWEEN_EMAILS_MS);
    }
  }

  return scheduledTime;
}

/**
 * Get rate limit stats for a sender
 */
export async function getRateLimitStats(senderEmail: string): Promise<{
  currentHourCount: number;
  maxPerHour: number;
  nextAvailableWindow?: Date;
}> {
  const check = await canSendEmail(senderEmail);
  return {
    currentHourCount: check.currentCount,
    maxPerHour: MAX_EMAILS_PER_HOUR,
    nextAvailableWindow: check.nextAvailableWindow,
  };
}

