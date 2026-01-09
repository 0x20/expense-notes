#!/bin/bash

# Expense Notes Deployment Script

set -e

echo "=================================="
echo "Expense Notes - Deployment Script"
echo "=================================="
echo ""

# Check if .env exists
if [ ! -f "backend/.env" ]; then
    echo "❌ Error: backend/.env not found!"
    echo ""
    echo "Please create it from the template:"
    echo "  cp backend/.env.production backend/.env"
    echo "  nano backend/.env"
    echo ""
    exit 1
fi

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Error: Docker is not running!"
    exit 1
fi

# Check if Traefik network exists
if ! docker network ls | grep -q "traefik_public"; then
    echo "⚠️  Warning: traefik_public network not found"
    echo "Creating network..."
    docker network create traefik_public
fi

echo "🔨 Building containers..."
docker compose build

echo ""
echo "🚀 Starting services..."
docker compose up -d

echo ""
echo "⏳ Waiting for services to start..."
sleep 5

echo ""
echo "📊 Service Status:"
docker compose ps

echo ""
echo "=================================="
echo "✅ Deployment Complete!"
echo "=================================="
echo ""
echo "Your application should be available at:"
echo "  Frontend: Check your Traefik dashboard"
echo "  Backend API Docs: /docs endpoint"
echo ""
echo "View logs with:"
echo "  docker compose logs -f"
echo ""
echo "If this is your first deployment, create an admin user:"
echo "  docker exec -it expense-notes-backend python setup.py"
echo ""
