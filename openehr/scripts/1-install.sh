#!/bin/bash
set -e

echo "--- [1/6] Starting EHRbase Full Installation ---"

# --- STEP 1: INSTALL DOCKER ENGINE ---
echo "--- [2/6] Installing Docker Engine ---"
sudo apt-get update
sudo apt-get install ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

# Add the repository to Apt sources:
echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "${UBUNTU_CODENAME:-$VERSION_CODENAME}") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update


# Firewall rules
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow 22/tcp
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw enable



# --- STEP 3: INSTALL AND CONFIGURE NGINX ---
echo "--- [4/6] Installing and Configuring Nginx ---"
sudo apt-get install -y nginx

# Create the Nginx configuration for the ehrbase proxy
sudo tee /etc/nginx/sites-available/ehrbase_api > /dev/null <<EOF
server {
    listen 80;
    listen [::]:80;
    server_name base.tibbna.com;

    access_log /var/log/nginx/access.log;
    error_log  /var/log/nginx/error.log warn;

    location ~ ^/ehrbase/rest/openehr {
        # optional API-key check
        if ($http_x_api_key != "BgMxGMZk5isfCWezE5CF") {
            return 403;
        }

        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        add_header X-Content-Type-Options nosniff;
        add_header X-Frame-Options DENY;
        add_header X-XSS-Protection "1; mode=block";
    }
    location / {
        return 403;
    }
}
EOF
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/ehrbase_api /etc/nginx/sites-enabled/

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx


sudo apt-get install -y certbot python3-certbot-nginx
sudo certbot --nginx -d base.tibbna.com
