#!/bin/bash
set -e

echo "🔄 Updating Tailscale Funnel Manager..."
echo ""

# Navigate to project directory
cd /DATA/AppData/tailscale-funnel-manager

echo "📥 Pulling latest changes from git..."
git pull origin main

echo ""
echo "🛑 Stopping current container..."
docker-compose down

echo ""
echo "🔨 Building new image (this may take a few minutes)..."
docker-compose build --no-cache

echo ""
echo "🚀 Starting container..."
docker-compose up -d

echo ""
echo "✅ Done! Waiting 10 seconds for container to start..."
sleep 10

echo ""
echo "📊 Container status:"
docker ps | grep tailscale-funnel-manager || echo "Container not running!"

echo ""
echo "📝 Last 50 lines of logs:"
docker logs --tail 50 tailscale-funnel-manager

echo ""
echo "🌐 Testing HTTP response:"
curl -I http://localhost:3002 2>/dev/null | head -5 || echo "Server not responding yet"

echo ""
echo "✨ Update complete!"
echo "🔗 Access the interface at: http://100.119.167.36:3002"
echo ""
echo "To follow logs in real-time, run:"
echo "docker logs -f tailscale-funnel-manager"
