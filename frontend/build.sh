#!/bin/bash

# Build frontend for production

cd "$(dirname "$0")"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Dependencies not installed. Run setup.sh first."
    exit 1
fi

# Build
echo "Building frontend for production..."
npm run build

echo ""
echo "✅ Build complete!"
echo "Production files are in the dist/ directory"
