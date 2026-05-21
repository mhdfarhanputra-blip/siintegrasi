#!/bin/bash
# ============================================
# Deploy SI Terintegrasi ke VPS
# Copy-paste seluruh script ini ke Web Console
# ============================================
set -e

echo "=== [1/7] Update & install dependencies ==="
sudo apt update
sudo apt install -y curl git nginx

# Install Node.js 20
if ! command -v node &> /dev/null || [[ $(node -v | cut -d. -f1 | tr -d v) -lt 20 ]]; then
  curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
  sudo apt install -y nodejs
fi
echo "Node: $(node -v) | NPM: $(npm -v)"

# Install PM2
sudo npm install -g pm2

echo "=== [2/7] Clone repository ==="
cd /home/ubuntu
rm -rf siintegrasi
git clone https://github.com/mhdfarhanputra-blip/siintegrasi.git
cd siintegrasi

echo "=== [3/7] Setup environment ==="
cat > .env.local << 'ENVEOF'
NEXT_PUBLIC_SUPABASE_URL=https://mhrtbgayfrhitviltqxq.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocnRiZ2F5ZnJoaXR2aWx0cXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzgzNTI0NjksImV4cCI6MjA5MzkyODQ2OX0.2DITDNaw3zDJU9m3OVXXvzmwSJZCDL6hiRn5KirTF7o
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1ocnRiZ2F5ZnJoaXR2aWx0cXhxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODM1MjQ2OSwiZXhwIjoyMDkzOTI4NDY5fQ.wKI0ffDr9ou66Ger8OqXgJj5Rwc_AFXKJ9LY2ddMElo
DEEPSEEK_API_KEY=sk-f0b34d5fb0984bbda951df3877967cc4
CLOUDINARY_CLOUD_NAME=df1ztztjs
CLOUDINARY_API_KEY=434455623195488
CLOUDINARY_API_SECRET=cjIpfafAVOPgCYG9EekgUdfnzrE
ENVEOF

echo "=== [4/7] Install & build ==="
npm ci
npm run build

echo "=== [5/7] Start with PM2 ==="
pm2 delete siintegrasi 2>/dev/null || true
pm2 start npm --name "siintegrasi" -- start
pm2 save
sudo env PATH=$PATH:/usr/bin pm2 startup systemd -u ubuntu --hp /home/ubuntu | tail -1 | bash 2>/dev/null || true

echo "=== [6/7] Configure Nginx ==="
sudo tee /etc/nginx/sites-available/siintegrasi > /dev/null << 'NGINXEOF'
server {
    listen 80;
    server_name 43.156.229.239 siintegrasi.is-a.dev;

    client_max_body_size 50M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
        proxy_send_timeout 60s;
    }
}
NGINXEOF

sudo ln -sf /etc/nginx/sites-available/siintegrasi /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx
sudo systemctl enable nginx

echo "=== [7/7] Firewall ==="
sudo ufw allow 80/tcp 2>/dev/null || true
sudo ufw allow 443/tcp 2>/dev/null || true
sudo ufw allow 22/tcp 2>/dev/null || true

echo ""
echo "============================================"
echo "  DEPLOYMENT BERHASIL!"
echo "============================================"
echo ""
echo "  Akses: http://43.156.229.239"
echo ""
echo "  Nanti setelah domain aktif:"
echo "  Akses: https://siintegrasi.is-a.dev"
echo "  SSL:   sudo apt install certbot python3-certbot-nginx"
echo "         sudo certbot --nginx -d siintegrasi.is-a.dev"
echo ""
echo "  Update kode:"
echo "    cd /home/ubuntu/siintegrasi"
echo "    git pull && npm run build && pm2 restart siintegrasi"
echo ""
