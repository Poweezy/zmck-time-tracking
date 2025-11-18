#!/bin/bash

# ZMCK Time Tracking System - Installation Script
# This script sets up the system for on-premise deployment

set -e

echo "=========================================="
echo "ZMCK Time Tracking System - Installation"
echo "=========================================="
echo ""

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "ERROR: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if Docker Compose is installed
if ! command -v docker-compose &> /dev/null; then
    echo "ERROR: Docker Compose is not installed. Please install Docker Compose first."
    exit 1
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "Creating .env file from template..."
    cp .env.example .env
    echo "WARNING: Please edit .env file and set secure passwords and JWT secret!"
    echo ""
fi

# Create data directories
echo "Creating data directories..."
mkdir -p data/uploads
mkdir -p data/uploads/exports
mkdir -p data/uploads/tasks
mkdir -p data/uploads/time_entries
mkdir -p data/uploads/projects
mkdir -p data/uploads/general
chmod -R 755 data

# Build and start containers
echo "Building Docker images..."
docker-compose build

echo "Starting services..."
docker-compose up -d postgres

# Wait for PostgreSQL to be ready
echo "Waiting for PostgreSQL to be ready..."
sleep 10

# Run migrations
echo "Running database migrations..."
docker-compose run --rm backend npm run migrate

# Run seeds
echo "Seeding database..."
docker-compose run --rm backend npm run seed

# Start all services
echo "Starting all services..."
docker-compose up -d

echo ""
echo "=========================================="
echo "Installation completed successfully!"
echo "=========================================="
echo ""
echo "The system is now running at:"
echo "  - Frontend: http://localhost"
echo "  - Backend API: http://localhost/api"
echo "  - API Documentation: http://localhost/api-docs"
echo ""
echo "Default login credentials:"
echo "  Email: admin@zmck.co.sz"
echo "  Password: admin123"
echo ""
echo "IMPORTANT: Change the default password after first login!"
echo ""
echo "To view logs: docker-compose logs -f"
echo "To stop: docker-compose down"
echo "To restart: docker-compose restart"

