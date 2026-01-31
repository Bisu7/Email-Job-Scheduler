CREATE TYPE "EmailStatus" AS ENUM ('SCHEDULED', 'PROCESSING', 'SENT', 'FAILED', 'RATE_LIMITED');


CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "avatar" TEXT,
    "googleId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "Email" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "recipientEmail" TEXT NOT NULL,
    "subject" TEXT NOT NULL,
    "body" TEXT NOT NULL,
    "scheduledFor" TIMESTAMP(3) NOT NULL,
    "sentAt" TIMESTAMP(3),
    "status" "EmailStatus" NOT NULL DEFAULT 'SCHEDULED',
    "errorMessage" TEXT,
    "senderEmail" TEXT,
    "jobId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Email_pkey" PRIMARY KEY ("id")
);


CREATE TABLE "RateLimit" (
    "id" TEXT NOT NULL,
    "senderEmail" TEXT NOT NULL,
    "hourWindow" TIMESTAMP(3) NOT NULL,
    "emailCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RateLimit_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

CREATE UNIQUE INDEX "User_googleId_key" ON "User"("googleId");

CREATE UNIQUE INDEX "Email_jobId_key" ON "Email"("jobId");

CREATE INDEX "Email_userId_idx" ON "Email"("userId");

CREATE INDEX "Email_status_idx" ON "Email"("status");

CREATE INDEX "Email_scheduledFor_idx" ON "Email"("scheduledFor");

CREATE INDEX "Email_jobId_idx" ON "Email"("jobId");

CREATE INDEX "RateLimit_senderEmail_hourWindow_idx" ON "RateLimit"("senderEmail", "hourWindow");


CREATE UNIQUE INDEX "RateLimit_senderEmail_hourWindow_key" ON "RateLimit"("senderEmail", "hourWindow");

ALTER TABLE "Email" ADD CONSTRAINT "Email_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
