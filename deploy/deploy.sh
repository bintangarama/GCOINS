#!/usr/bin/env bash

# ==============================================================================
# G-COINS VPS Deployment Script
# Execute from application root: ./deploy/deploy.sh
# ==============================================================================

set -euo pipefail

echo ">>> Starting G-COINS Deployment..."

# 1. Activate Maintenance Mode
php artisan down --render="errors::503" --secret="gcoins-deploy-bypass" || true

# 2. Pull Latest Code
echo ">>> Pulling latest code from Git..."
git pull origin main

# 3. Install PHP Dependencies (No Dev, Optimized Classmap)
echo ">>> Installing Composer dependencies..."
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction

# 4. Database Migrations
echo ">>> Running database migrations..."
php artisan migrate --force

# 5. Build Front-end Assets (Smart Low-RAM Handling)
if [ ! -d "public/build" ] && command -v npm &> /dev/null; then
    echo ">>> Building front-end assets (npm build)..."
    npm ci --prefer-offline
    npm run build
else
    echo ">>> Pre-built front-end assets detected in public/build (skipping npm build to preserve RAM)."
fi

# 6. Optimize Laravel Caches
echo ">>> Clearing & Warming Application Caches..."
php artisan optimize:clear
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache

# 7. Restart Background Queue Workers
echo ">>> Restarting Supervisor queue workers..."
sudo supervisorctl restart gcoins-worker:* || true

# 8. Reload PHP-FPM for fresh OPcache
echo ">>> Reloading PHP-FPM..."
sudo systemctl reload php8.4-fpm || true

# 9. Deactivate Maintenance Mode
php artisan up

echo ">>> Deployment completed successfully!"
