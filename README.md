# Email Job Scheduler

A production-grade email scheduler service with dashboard, built with TypeScript, Express.js, BullMQ, Redis, PostgreSQL, and Next.js.

## Features

- **Email Scheduling**: Schedule emails to be sent at specific times
- **Rate Limiting**: Configurable hourly rate limits per sender
- **Concurrency Control**: Configurable worker concurrency
- **Delay Between Emails**: Minimum delay between individual email sends
- **Persistence**: Survives server restarts without losing jobs
- **Idempotency**: Prevents duplicate email sends
- **Google OAuth**: Secure authentication with Google Sign-In
- **Dashboard**: Modern UI to schedule, view scheduled, and view sent emails
- **CSV Upload**: Bulk email scheduling via CSV file upload

## Tech Stack

### Backend
- **TypeScript**
- **Express.js**
- **BullMQ** (job queue with Redis)
- **PostgreSQL** (with Prisma ORM)
- **Redis** (for queue and rate limiting)
- **Ethereal Email** (fake SMTP for testing)
- **JWT** (authentication)

### Frontend
- **Next.js 14** (App Router)
- **TypeScript**
- **Tailwind CSS**
- **React Query** (data fetching)
- **Google OAuth** (authentication)

## Setup Instructions

### Prerequisites

- Node.js 18+ and npm
- Docker and Docker Compose (for Redis and PostgreSQL)
- Google OAuth credentials (for authentication)

### 1. Clone and Install

```bash
# Install root dependencies
npm install

# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### 2. Set Up Database and Redis

Start PostgreSQL and Redis using Docker Compose:

```bash
docker-compose up -d
```

This will start:
- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 3. Configure Backend

1. Copy the example environment file:
```bash
cd backend
cp .env.example .env
```

2. Update `backend/.env` with your configuration:
```env
PORT=3001
NODE_ENV=development

# Database (matches docker-compose.yml)
DATABASE_URL="postgresql://user:password@localhost:5432/email_scheduler?schema=public"

# Redis (matches docker-compose.yml)
REDIS_HOST=localhost
REDIS_PORT=6379

# Google OAuth
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# JWT Secret (change in production!)
JWT_SECRET=your_jwt_secret_key_change_in_production

# Rate Limiting Configuration
MAX_EMAILS_PER_HOUR=200
MIN_DELAY_BETWEEN_EMAILS_MS=2000
WORKER_CONCURRENCY=5
```

3. Run database migrations:
```bash
cd backend
npm run db:generate
npm run db:migrate
```

### 4. Configure Frontend

1. Copy the example environment file:
```bash
cd frontend
cp .env.example .env.local
```

2. Update `frontend/.env.local`:
```env
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_GOOGLE_CLIENT_ID=your_google_client_id
```

### 5. Get Google OAuth Credentials

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable Google+ API
4. Go to "Credentials" → "Create Credentials" → "OAuth client ID"
5. Configure OAuth consent screen
6. Create OAuth 2.0 Client ID for "Web application"
7. Add authorized redirect URI: `http://localhost:3000/login`
8. Copy the Client ID and Client Secret to your `.env` files

### 6. Start the Application

From the root directory:

```bash
# Start both backend and frontend
npm run dev
```

Or start them separately:

```bash
# Terminal 1: Backend
cd backend
npm run dev

# Terminal 2: Frontend
cd frontend
npm run dev
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

## Rate Limiting Implementation

### Overview

The system implements multiple layers of rate limiting and throttling:

1. **Hourly Rate Limit**: Maximum emails per hour per sender (default: 200)
2. **Minimum Delay**: Minimum delay between individual email sends (default: 2000ms)
3. **Worker Concurrency**: Number of parallel workers (default: 5)

### How It Works

#### 1. Hourly Rate Limiting

- **Storage**: Uses Redis for fast atomic operations and PostgreSQL for persistence
- **Key Format**: `rate_limit:{senderEmail}:{hourWindowTimestamp}`
- **Check**: Before sending each email, the system checks if the sender has reached the hourly limit
- **Rescheduling**: When the limit is reached, emails are automatically rescheduled to the next available hour window
- **Persistence**: Rate limit counters are stored in both Redis (for speed) and PostgreSQL (for persistence)

#### 2. Delay Between Emails

- **Implementation**: BullMQ limiter + explicit delay in worker
- **Default**: 2000ms (2 seconds) minimum delay between emails
- **Purpose**: Mimics provider throttling and prevents overwhelming the SMTP server

#### 3. Worker Concurrency

- **Configuration**: Set via `WORKER_CONCURRENCY` environment variable
- **Default**: 5 concurrent workers
- **Safety**: Each worker processes jobs safely in parallel with proper rate limit checks

### Behavior Under Load

When **1000+ emails** are scheduled for the same time:

1. Emails are scheduled with staggered delays (based on `delayBetweenEmails`)
2. Rate limit checks happen before each send
3. If hourly limit is reached, emails are rescheduled to the next hour window
4. The system maintains order as much as possible while respecting rate limits
5. No emails are dropped - they are all eventually sent

### Configuration

All rate limiting parameters are configurable via environment variables:

```env
MAX_EMAILS_PER_HOUR=200          # Max emails per hour per sender
MIN_DELAY_BETWEEN_EMAILS_MS=2000 # Minimum delay between sends (ms)
WORKER_CONCURRENCY=5              # Number of parallel workers
```

### Trade-offs

- **Redis vs Database**: Redis provides fast atomic operations for rate limit checks, while PostgreSQL ensures persistence across restarts
- **Rescheduling vs Dropping**: Emails are rescheduled rather than dropped to ensure delivery
- **Order Preservation**: While we try to maintain order, rate limits may cause some emails to be sent in the next hour window

##  Persistence and Idempotency

### Persistence

- **Database**: All emails are stored in PostgreSQL before scheduling
- **Queue**: BullMQ uses Redis for job persistence
- **Rate Limits**: Stored in both Redis (fast) and PostgreSQL (persistent)
- **Server Restarts**: Jobs are automatically resumed from Redis/BullMQ

### Idempotency

- **Job IDs**: Each email uses its database ID as the BullMQ job ID
- **Duplicate Prevention**: BullMQ prevents duplicate jobs with the same ID
- **Status Tracking**: Email status is tracked in the database (SCHEDULED, PROCESSING, SENT, FAILED, RATE_LIMITED)

##  Project Structure

```
.
├── backend/
│   ├── src/
│   │   ├── config/          # Configuration (DB, Redis, SMTP)
│   │   ├── queue/           # BullMQ queue setup
│   │   ├── workers/         # Email worker
│   │   ├── services/        # Business logic (email, rate limiting)
│   │   ├── routes/          # API routes
│   │   └── index.ts         # Entry point
│   ├── prisma/
│   │   └── schema.prisma    # Database schema
│   └── package.json
├── frontend/
│   ├── app/                 # Next.js app directory
│   │   ├── dashboard/       # Dashboard page
│   │   ├── login/           # Login page
│   │   └── layout.tsx       # Root layout
│   ├── components/          # React components
│   ├── hooks/               # Custom hooks
│   ├── lib/                 # Utilities (API client)
│   └── package.json
├── docker-compose.yml       # Docker setup for DB and Redis
└── README.md
```

## Testing

### Manual Testing

1. **Login**: Use Google OAuth to log in
2. **Schedule Emails**: 
   - Click "Compose New Email"
   - Fill in subject and body
   - Upload a CSV file with email addresses
   - Set start time, delay, and hourly limit
   - Click "Schedule"
3. **View Scheduled**: Check the "Scheduled Emails" tab
4. **View Sent**: Check the "Sent Emails" tab after emails are sent

### CSV Format

The CSV file should contain email addresses. Examples:

**Simple format (one email per line):**
```
email1@example.com
email2@example.com
email3@example.com
```

**CSV with headers:**
```csv
email,name
email1@example.com,John Doe
email2@example.com,Jane Smith
```

The system will automatically extract email addresses from the CSV.

## Troubleshooting

### Database Connection Issues

- Ensure Docker containers are running: `docker-compose ps`
- Check database URL in `.env` matches docker-compose.yml
- Run migrations: `cd backend && npm run db:migrate`

### Redis Connection Issues

- Ensure Redis container is running: `docker-compose ps`
- Check Redis host/port in `.env`

### Google OAuth Issues

- Verify Client ID is set in both backend and frontend `.env` files
- Check redirect URI matches: `http://localhost:3000/login`
- Ensure OAuth consent screen is configured

### Email Not Sending

- Check Ethereal Email credentials (will be generated on first run)
- Check rate limits haven't been exceeded
- Check worker logs for errors
- Verify SMTP transporter is initialized

##  Environment Variables Reference

### Backend

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | - |
| `REDIS_HOST` | Redis host | `localhost` |
| `REDIS_PORT` | Redis port | `6379` |
| `MAX_EMAILS_PER_HOUR` | Hourly rate limit | `200` |
| `MIN_DELAY_BETWEEN_EMAILS_MS` | Min delay between emails (ms) | `2000` |
| `WORKER_CONCURRENCY` | Worker concurrency | `5` |
| `JWT_SECRET` | JWT signing secret | - |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | - |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | - |

### Frontend

| Variable | Description | Default |
|----------|-------------|---------|
| `NEXT_PUBLIC_API_URL` | Backend API URL | `http://localhost:3001` |
| `NEXT_PUBLIC_GOOGLE_CLIENT_ID` | Google OAuth client ID | - |

##  Production Deployment

For production deployment:

1. **Change JWT Secret**: Use a strong, random secret
2. **Use Real SMTP**: Replace Ethereal Email with a real SMTP provider
3. **Secure Database**: Use managed PostgreSQL with proper credentials
4. **Redis Cluster**: Consider Redis cluster for high availability
5. **Environment Variables**: Set all required environment variables
6. **HTTPS**: Use HTTPS for OAuth redirects
7. **Rate Limits**: Adjust rate limits based on your SMTP provider's limits

