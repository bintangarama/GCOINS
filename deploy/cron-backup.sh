#!/usr/bin/env bash

# ==============================================================================
# G-COINS Daily Automated Backup Script
# Retention: 30 days rolling
# Schedule in crontab: 0 2 * * * /var/www/gcoins/deploy/cron-backup.sh >> /var/log/gcoins-backup.log 2>&1
# ==============================================================================

set -euo pipefail

APP_DIR="/var/www/gcoins"
BACKUP_DIR="/var/backups/gcoins"
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
TEMP_DIR="/tmp/gcoins_backup_${TIMESTAMP}"
BACKUP_FILE="${BACKUP_DIR}/gcoins_backup_${TIMESTAMP}.tar.gz"

echo "=========================================================="
echo "[$(date '+%Y-%m-%d %H:%M:%S')] Starting G-COINS Backup..."
echo "=========================================================="

mkdir -p "${BACKUP_DIR}"
mkdir -p "${TEMP_DIR}"

DB_FILE="${APP_DIR}/database/database.sqlite"
STORAGE_DIR="${APP_DIR}/storage/app/public"

# 1. Safe SQLite Backup (WAL-safe using sqlite3 .backup API)
if [ -f "${DB_FILE}" ]; then
    echo "Backing up SQLite database..."
    sqlite3 "${DB_FILE}" ".backup '${TEMP_DIR}/database.sqlite'"
    # Verify backup integrity
    INTEGRITY_CHECK=$(sqlite3 "${TEMP_DIR}/database.sqlite" "PRAGMA integrity_check;")
    if [ "${INTEGRITY_CHECK}" != "ok" ]; then
        echo "ERROR: Backup integrity check failed (${INTEGRITY_CHECK})!"
        rm -rf "${TEMP_DIR}"
        exit 1
    fi
    echo "Database backup integrity verified: OK"
else
    echo "WARNING: ${DB_FILE} not found!"
fi

# 2. Backup Uploaded Files / Attachments
if [ -d "${STORAGE_DIR}" ]; then
    echo "Copying uploaded attachments..."
    cp -r "${STORAGE_DIR}" "${TEMP_DIR}/storage"
fi

# 3. Create Compressed Archive
echo "Creating compressed tar.gz archive..."
tar -czf "${BACKUP_FILE}" -C "${TEMP_DIR}" .

# Remove Temporary Directory
rm -rf "${TEMP_DIR}"

BACKUP_SIZE=$(du -h "${BACKUP_FILE}" | cut -f1)
echo "Backup created successfully: ${BACKUP_FILE} (${BACKUP_SIZE})"

# 4. Enforce 30-Day Rolling Retention Policy
echo "Purging backups older than 30 days..."
find "${BACKUP_DIR}" -name "gcoins_backup_*.tar.gz" -type f -mtime +30 -exec rm -f {} +

echo "[$(date '+%Y-%m-%d %H:%M:%S')] Backup finished successfully."
echo "=========================================================="
