#!/bin/bash

# ZMCK Time Tracking System - Backup Script
# This script creates backups of the database and uploaded files

set -e

BACKUP_DIR="./backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="zmck_backup_${TIMESTAMP}"

echo "=========================================="
echo "ZMCK Time Tracking System - Backup"
echo "=========================================="
echo ""

# Create backup directory
mkdir -p "${BACKUP_DIR}"

# Backup database
echo "Backing up database..."
docker-compose exec -T postgres pg_dump -U ${POSTGRES_USER:-zmck_user} ${POSTGRES_DB:-zmck_timetracking} > "${BACKUP_DIR}/${BACKUP_NAME}.sql"

# Backup uploaded files
echo "Backing up uploaded files..."
tar -czf "${BACKUP_DIR}/${BACKUP_NAME}_files.tar.gz" data/uploads/

# Create combined backup archive
echo "Creating backup archive..."
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}.sql" "${BACKUP_NAME}_files.tar.gz"
rm "${BACKUP_NAME}.sql" "${BACKUP_NAME}_files.tar.gz"
cd ..

echo ""
echo "Backup completed: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo ""

# Optional: Keep only last 7 backups
echo "Cleaning old backups (keeping last 7)..."
cd "${BACKUP_DIR}"
ls -t zmck_backup_*.tar.gz | tail -n +8 | xargs -r rm
cd ..

echo "Backup process completed!"

