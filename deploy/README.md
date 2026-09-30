# Panduan Lengkap: Push ke GitHub & Deploy ke VPS (Low-RAM Edition)

Dokumen ini memuat panduan langkah-demi-langkah:
1. **Push project G-COINS dari komputer lokal ke GitHub**.
2. **Deploy ke VPS hemat sumber daya (1 vCPU, 1 GB RAM, 2 GB Swap)** yang berbagi sumber daya dengan service lain (seperti Bot Telegram).

---

## Arsitektur Deployment Low-RAM (Zero-Build Server)

Untuk menjaga kestabilan VPS 1 GB RAM dan memastikan Bot Telegram Anda tidak kehabisan memori atau mengalami *timeout*:
- **Build Frontend di Komputer Lokal**: Asset Vite (`React 19 + Tailwind v4`) dikompilasi di lokal (`npm run build`) yang hanya berukuran ±1.2 MB di `public/build`. Aset ini ikut di-push ke Git.
- **VPS Bebas Node.js**: VPS **tidak perlu menginstal Node.js dan NPM**, menghemat ratusan MB memori dan disk.
- **PHP-FPM Mode `ondemand`**: Worker PHP hanya mengonsumsi RAM saat ada request masuk dan langsung melepaskan memori setelah 10 detik idle.
- **Supervisor Queue Worker Minimalis**: 1 proses worker yang dibatasi maksimal 64 MB memori.
- **SQLite WAL Mode**: Tanpa service database terpisah (MySQL/PostgreSQL), konsumsi memori database menyatu dengan PHP.

---

## BAGIAN 1: Persiapan & Push Project ke GitHub (Di Komputer Lokal)

Lakukan langkah-langkah ini di terminal komputer lokal Anda (tempat project ini berada):

### 1. Kompilasi Aset Frontend di Lokal
Pastikan aset frontend produksi sudah dibangun:
```bash
npm run build
```
*(Folder `public/build` sudah diset agar ikut ter-commit ke Git melalui `.gitignore`).*

### 2. Inisialisasi Repository Git & Commit
Jika project ini belum terhubung dengan Git:
```bash
# Inisialisasi Git
git init

# Tambahkan semua file yang tidak di-ignore
git add .

# Buat commit pertama
git commit -m "feat: initial commit g-coins ready for deployment"
```

### 3. Buat Repository di GitHub
1. Buka [GitHub](https://github.com/new).
2. Buat repository baru (disarankan **Private** karena ini sistem internal kas opname).
3. Jangan centang *Initialize with README*, *.gitignore*, atau *license*.
4. Salin URL repository Anda (contoh: `https://github.com/username/gcoins.git` atau SSH `git@github.com:username/gcoins.git`).

### 4. Hubungkan dan Push ke GitHub
```bash
# Set branch utama ke main
git branch -M main

# Tambahkan remote repository GitHub Anda (ganti URL di bawah)
git remote add origin https://github.com/<username>/<nama-repo>.git

# Push ke GitHub
git push -u origin main
```

---

## BAGIAN 2: Persiapan Server VPS (Ubuntu 22.04 / 24.04 LTS)

Masuk ke server VPS Anda via SSH:
```bash
ssh user@ip-vps-anda
```

### 1. Verifikasi Swap Memory
Pastikan Swap 2 GB aktif:
```bash
free -h
swapon --show
```
Jika swap belum ada atau kurang dari 2 GB:
```bash
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
```

### 2. Instalasi Paket Dasar & PHP 8.4
Instal hanya paket yang diperlukan (tanpa Node.js):
```bash
# Update repository
sudo apt update && sudo apt upgrade -y
sudo apt install -y software-properties-common curl git unzip supervisor sqlite3 nginx certbot python3-certbot-nginx

# Tambahkan PPA PHP 8.4 resmi
sudo add-apt-repository ppa:ondrej/php -y
sudo apt update

# Instal PHP 8.4 & ekstensi yang dibutuhkan G-COINS
sudo apt install -y php8.4-cli php8.4-fpm php8.4-sqlite3 php8.4-mbstring \
    php8.4-xml php8.4-curl php8.4-zip php8.4-gd php8.4-intl php8.4-bcmath \
    php8.4-opcache

# Instal Composer secara global
curl -sS https://getcomposer.org/installer | php
sudo mv composer.phar /usr/local/bin/composer
```

---

## BAGIAN 3: Clone Project & Konfigurasi di VPS

### 1. Clone Repository
```bash
# Siapkan direktori web
sudo mkdir -p /var/www/gcoins
sudo chown -R $USER:www-data /var/www/gcoins

# Clone repository dari GitHub
git clone https://github.com/<username>/<nama-repo>.git /var/www/gcoins
cd /var/www/gcoins
```

### 2. Setup File Environment (`.env`)
Salin file konfigurasi produksi:
```bash
cp .env.example .env
nano .env
```
Sesuaikan variabel krusial berikut di dalam file `.env`:
```ini
APP_NAME=G-COINS
APP_ENV=production
APP_KEY=
APP_DEBUG=false
APP_URL=https://gcoins.domainanda.com

DB_CONNECTION=sqlite
DB_DATABASE=/var/www/gcoins/database/database.sqlite

QUEUE_CONNECTION=database
SESSION_DRIVER=database
CACHE_STORE=database
```
Simpan (`Ctrl+O`, `Enter`, lalu `Ctrl+X`).

### 3. Instal Dependensi PHP
Jalankan composer dengan flag produksi:
```bash
composer install --no-dev --prefer-dist --optimize-autoloader --no-interaction
```

### 4. Inisialisasi Database SQLite & Key
```bash
# Generate encryption key
php artisan key:generate

# Buat file database SQLite
touch database/database.sqlite

# Migrasi tabel dan seed data awal
php artisan migrate --force --seed

# Aktifkan WAL Mode & Timeout (Sangat penting untuk stabilitas konkurensi)
sqlite3 database/database.sqlite "PRAGMA journal_mode=WAL;"
sqlite3 database/database.sqlite "PRAGMA busy_timeout=5000;"
```

### 5. Atur Permission Direktori
Pastikan Nginx & PHP-FPM (`www-data`) memiliki hak akses baca dan tulis:
```bash
sudo chown -R www-data:www-data /var/www/gcoins/storage
sudo chown -R www-data:www-data /var/www/gcoins/bootstrap/cache
sudo chown -R www-data:www-data /var/www/gcoins/database
sudo chmod -R 775 /var/www/gcoins/storage
sudo chmod -R 775 /var/www/gcoins/database
sudo chmod 664 /var/www/gcoins/database/database.sqlite
```

---

## BAGIAN 4: Konfigurasi Service Hemat Memori (Low-RAM)

### 1. Konfigurasi PHP-FPM Hemat Memori
Salin file konfigurasi pool `ondemand` yang sudah disediakan:
```bash
sudo cp deploy/php-fpm-lowram.conf /etc/php/8.4/fpm/pool.d/gcoins.conf

# Tes konfigurasi dan restart PHP-FPM
sudo php-fpm8.4 -t
sudo systemctl restart php8.4-fpm
```

### 2. Konfigurasi Supervisor (Queue Worker Hemat)
Salin konfigurasi 1 worker yang dibatasi 64 MB:
```bash
sudo cp deploy/supervisor-lowram.conf /etc/supervisor/conf.d/gcoins.conf

# Daftarkan dan jalankan worker
sudo supervisorctl reread
sudo supervisorctl update
sudo supervisorctl start gcoins-worker:*
sudo supervisorctl status
```

### 3. Konfigurasi Nginx & SSL
1. Salin konfigurasi Nginx:
   ```bash
   sudo cp deploy/nginx.conf /etc/nginx/sites-available/gcoins.conf
   sudo ln -s /etc/nginx/sites-available/gcoins.conf /etc/nginx/sites-enabled/
   sudo rm -f /etc/nginx/sites-enabled/default
   ```
2. Edit domain di Nginx:
   ```bash
   sudo nano /etc/nginx/sites-available/gcoins.conf
   ```
   *Ganti `gcoins.gramedia.com` dengan domain/subdomain milik Anda.*
3. Buat sertifikat SSL gratis via Certbot:
   ```bash
   sudo certbot --nginx -d domainanda.com
   ```
4. Uji dan restart Nginx:
   ```bash
   sudo nginx -t
   sudo systemctl restart nginx
   ```

### 4. Cache & Optimize Laravel
Jalankan kompresi konfigurasi dan route untuk performa maksimal:
```bash
php artisan optimize
```

---

## BAGIAN 5: Setup Crontab (Laravel Scheduler & Backup)

Buka crontab dengan `crontab -e`:
```bash
# 1. Jalankan Laravel Scheduler setiap menit
* * * * * cd /var/www/gcoins && php artisan schedule:run >> /dev/null 2>&1

# 2. Backup database harian jam 02:00 WIB
0 2 * * * /var/www/gcoins/deploy/cron-backup.sh >> /var/log/gcoins-backup.log 2>&1
```

Pastikan script backup memiliki izin eksekusi:
```bash
chmod +x /var/www/gcoins/deploy/cron-backup.sh
chmod +x /var/www/gcoins/deploy/deploy.sh
```

---

## BAGIAN 6: Workflow Update Rutin (Saat Ada Perubahan Kode)

Kapan saja Anda melakukan update aplikasi di komputer lokal:

### Di Komputer Lokal:
1. Jika ada perubahan tampilan UI / React / Tailwind:
   ```bash
   npm run build
   ```
2. Commit dan push ke GitHub:
   ```bash
   git add .
   git commit -m "Update fitur atau perbaikan bug"
   git push origin main
   ```

### Di Server VPS:
Cukup jalankan satu perintah ini:
```bash
cd /var/www/gcoins
./deploy/deploy.sh
```
Script `deploy.sh` akan otomatis:
- Menyalakan maintenance mode sementara.
- Mengambil kode terbaru via `git pull`.
- Menjalankan `composer install` jika ada pustaka baru.
- Menjalankan migrasi database baru (`php artisan migrate --force`).
- Menggunakan build frontend dari lokal tanpa membebani RAM VPS.
- Memperbarui cache Laravel (`config`, `route`, `view`).
- Merestart queue worker & reload PHP-FPM.
- Membuka kembali aplikasi.
