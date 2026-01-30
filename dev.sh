#!/bin/bash
# Development script - launches backend + frontend with hot-reload
# Usage: ./dev.sh

echo "🚀 Starting Hearst Mining Architect in development mode..."

# Kill any existing processes on ports 3006 and 3106
echo "Cleaning up existing processes..."
lsof -ti:3006 | xargs kill -9 2>/dev/null
lsof -ti:3106 | xargs kill -9 2>/dev/null

# Start backend in background
echo "📦 Starting backend on port 3006..."
cd backend && npm run dev 2>/dev/null || npm start &
BACKEND_PID=$!

# Wait for backend to start
sleep 2

# Start frontend in foreground
echo "🎨 Starting frontend on port 3106..."
cd ../frontend && npm run dev

# Cleanup on exit
trap "kill $BACKEND_PID 2>/dev/null" EXIT
