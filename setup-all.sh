#!/bin/bash

# Setup both backend and frontend

cd "$(dirname "$0")"

echo "========================================="
echo "  Expense Notes - Full Setup"
echo "========================================="
echo ""

# Setup backend
echo "📦 Setting up backend..."
cd backend
./setup.sh
cd ..

echo ""
echo "========================================="
echo ""

# Setup frontend
echo "📦 Setting up frontend..."
cd frontend
./setup.sh
cd ..

echo ""
echo "========================================="
echo "  ✅ Full setup complete!"
echo "========================================="
echo ""
echo "Next steps:"
echo "1. Create admin user: cd backend && python setup.py"
echo "2. Configure email in backend/.env (optional)"
echo "3. Start development: ./dev.sh"
