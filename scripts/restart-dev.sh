#!/bin/bash

echo "🔄 Restarting Development Environment"
echo "======================================"

# Kill any existing node processes
echo "1. Killing existing Node.js processes..."
pkill -f "node" || echo "No node processes found"

# Wait a moment for processes to fully terminate
sleep 2

# Clear Metro cache and restart
echo "2. Starting Metro bundler with cleared cache..."
echo "   This will show the QR code and tunnel URL"
echo "   Note the URL for your .env file"
echo ""

# Start Metro with tunnel and cleared cache
npx expo start --tunnel -c 