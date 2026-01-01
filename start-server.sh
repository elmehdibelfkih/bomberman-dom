#!/bin/bash

# Bomberman Game Server Startup Script

echo "🎮 Starting Bomberman Multiplayer Server..."

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is not installed. Please install Node.js first."
    exit 1
fi

# Navigate to server directory
cd "$(dirname "$0")/server"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the server
echo "🚀 Starting server on port 8080..."
echo "🌐 Game will be available at: http://localhost:8080"
echo "📡 WebSocket server ready for multiplayer connections"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""

npm start