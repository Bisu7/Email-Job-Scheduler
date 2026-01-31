#!/bin/bash

# Initialize database script
echo "🔧 Initializing database..."

# Generate Prisma client
echo "📦 Generating Prisma client..."
npm run db:generate

# Run migrations
echo "🗄️  Running migrations..."
npm run db:migrate

echo "✅ Database initialized!"

