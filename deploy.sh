#!/bin/bash
# ==========================================
# new.bee - Raspberry Pi Deploy Script
# ==========================================
# Usage: 
#   chmod +x deploy.sh
#   ./deploy.sh
# ==========================================

set -e

echo ""
echo "  🐝 new.bee - Deploying to Raspberry Pi"
echo "  ======================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "  ⚙️  Docker not found. Installing..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker $USER
    echo "  ✅ Docker installed. You may need to log out and back in."
    echo "     Then re-run this script."
    exit 0
fi

# Check if docker compose is available
if ! docker compose version &> /dev/null; then
    echo "  ❌ Docker Compose not found."
    echo "     Install with: sudo apt install docker-compose-plugin"
    exit 1
fi

# Set admin password
if [ -z "$ADMIN_PASSWORD" ]; then
    read -sp "  🔑 Set admin password (or press Enter for default): " ADMIN_PASSWORD
    echo ""
    if [ -z "$ADMIN_PASSWORD" ]; then
        ADMIN_PASSWORD="newbee_admin_2024"
        echo "  ℹ️  Using default password: newbee_admin_2024"
    fi
fi

export ADMIN_PASSWORD

# Build and start
echo ""
echo "  🔨 Building container..."
docker compose build

echo ""
echo "  🚀 Starting new.bee..."
docker compose up -d

echo ""
echo "  ✅ new.bee is running!"
echo ""
echo "  Local:    http://localhost:3000"
echo "  Network:  http://$(hostname -I | awk '{print $1}'):3000"
echo ""
echo "  Commands:"
echo "    View logs:     docker compose logs -f"
echo "    Stop:          docker compose down"
echo "    Restart:       docker compose restart"
echo "    Update:        git pull && docker compose up -d --build"
echo ""
