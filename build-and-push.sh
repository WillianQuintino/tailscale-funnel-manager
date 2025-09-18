#!/bin/bash

echo "🐳 Building and pushing Tailscale Funnel Manager Docker image..."

# Build the image
echo "📦 Building Docker image..."
docker build -t willianquintino/tailscale-funnel-manager:latest .

if [ $? -eq 0 ]; then
    echo "✅ Image built successfully!"

    # Push to Docker Hub
    echo "🚀 Pushing to Docker Hub..."
    docker push willianquintino/tailscale-funnel-manager:latest

    if [ $? -eq 0 ]; then
        echo "✅ Image pushed successfully!"
        echo ""
        echo "🎉 Docker image is now available at:"
        echo "willianquintino/tailscale-funnel-manager:latest"
        echo ""
        echo "You can now install it in CasaOS!"
    else
        echo "❌ Failed to push image"
        echo "Make sure you're logged in to Docker Hub:"
        echo "docker login"
    fi
else
    echo "❌ Failed to build image"
fi