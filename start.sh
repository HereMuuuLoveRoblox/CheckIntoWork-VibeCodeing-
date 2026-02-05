#!/bin/bash
# Working Time - Start All Services
# รันคำสั่งนี้: ./start.sh

echo "========================================"
echo "  Working Time - Starting Services"
echo "========================================"

# Get local IP address
LOCAL_IP=$(hostname -I | awk '{print $1}')
echo ""
echo "Local IP: $LOCAL_IP"

# Update API URL in Frontend
API_FILE="Front-End/src/services/api.js"
sed -i "s|const API_BASE_URL = 'http://[^']*';|const API_BASE_URL = 'http://${LOCAL_IP}:8000';|" $API_FILE
echo "Updated API URL to: http://${LOCAL_IP}:8000"

# Start Backend with Docker
echo ""
echo "[1/2] Starting Backend (Docker)..."
cd Back-End
docker-compose up -d --build
cd ..

# Wait for backend to be ready
echo "Waiting for Backend to be ready..."
sleep 10

# Check if backend is running
if curl -s http://localhost:8000/docs > /dev/null; then
    echo "Backend is running!"
else
    echo "Backend may still be starting..."
fi

# Start Frontend with Expo
echo ""
echo "[2/2] Starting Frontend (Expo)..."
cd Front-End
echo ""
echo "========================================"
echo "  Scan QR Code with Expo Go app"
echo "========================================"
npx expo start --tunnel
