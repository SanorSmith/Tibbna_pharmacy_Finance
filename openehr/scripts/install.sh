#!/bin/bash
set -e

# ==================================================================================
# ==                  CONFIGURATION - CHANGE THESE VALUES!                        ==
# ==================================================================================
# Set the username and password for the ehrbase API
EHRBASE_USER="user"
EHRBASE_PASSWORD="password"

# Set the password for the internal 'ehrbase_restricted' database user
# This can be left as is, as it's only used for communication between the containers
DB_RESTRICTED_PASSWORD="ehrbase_restricted"

# ==================================================================================
# ==                      SCRIPT - DO NOT EDIT BELOW THIS LINE                    ==
# ==================================================================================

echo "--- [1/6] Starting EHRbase Full Installation ---"

# --- STEP 1: INSTALL DOCKER ENGINE ---
echo "--- [2/6] Installing Docker Engine ---"
sudo apt-get update
sudo apt-get install -y ca-certificates curl
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc

echo \
  "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu \
  $(. /etc/os-release && echo "$VERSION_CODENAME") stable" | \
  sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt-get update
sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin

# --- STEP 2: INSTALL DOCKER COMPOSE ---
echo "--- [3/6] Installing Docker Compose ---"
COMPOSE_VERSION=$(curl -s https://api.github.com/repos/docker/compose/releases/latest | grep 'tag_name' | cut -d\" -f4)
sudo curl -L "https://github.com/docker/compose/releases/download/${COMPOSE_VERSION}/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# --- STEP 3: CREATE DOCKER-COMPOSE.YML FILE ---
echo "--- [4/6] Creating docker-compose.yml ---"
cat <<EOF > docker-compose.yml
version: '3.8'

services:
  ehrbase-postgres:
    image: ehrbase/ehrbase-v2-postgres:16.2
    container_name: ehrbase-postgres
    restart: always
    environment:
      POSTGRES_USER: postgres
      PASSWORD: postgres
      EHRBASE_USER: ehrbase_restricted
      EHRBASE_PASSWORD: ${DB_RESTRICTED_PASSWORD}
      EHRBASE_USER_ADMIN: ehrbase
      EHRBASE_PASSWORD_ADMIN: ehrbase
    volumes:
      - ehrbase-db-data:/var/lib/postgresql/data

  ehrbase:
    image: ehrbase/ehrbase:latest
    container_name: ehrbase
    restart: always
    depends_on:
      - ehrbase-postgres
    environment:
      DB_URL: jdbc:postgresql://ehrbase-postgres:5432/ehrbase
      DB_USER: ehrbase_restricted
      DB_PASS: ${DB_RESTRICTED_PASSWORD}
      DB_USER_ADMIN: ehrbase
      DB_PASS_ADMIN: ehrbase
      SERVER_NODENAME: local.ehrbase.org
      SECURITY_AUTHTYPE: BASIC
      SECURITY_AUTHUSER: ${EHRBASE_USER}
      SECURITY_AUTHPASSWORD: ${EHRBASE_PASSWORD}
    ports:
      - "127.0.0.1:8080:8080" # Only expose to localhost for Nginx

volumes:
  ehrbase-db-data:
EOF

# --- STEP 4: INSTALL AND CONFIGURE NGINX ---
echo "--- [5/6] Installing and Configuring Nginx ---"
sudo apt-get install -y nginx

# Create the Nginx configuration for the ehrbase proxy
sudo tee /etc/nginx/sites-available/ehrbase_api > /dev/null <<EOF
server {
    listen 80 default_server;
    listen [::]:80 default_server;

    server_name _;

    location / {
        # Permissive CORS for development
        if (\$request_method = 'OPTIONS') {
            add_header 'Access-Control-Allow-Origin' '*';
            add_header 'Access-Control-Allow-Methods' 'GET, POST, PUT, DELETE, OPTIONS';
            add_header 'Access-Control-Allow-Headers' 'Authorization, Content-Type, prefer, Ehr-Session';
            add_header 'Access-Control-Max-Age' 1728000;
            add_header 'Content-Type' 'text/plain; charset=utf-8';
            add_header 'Content-Length' 0;
            return 204;
        }
        add_header 'Access-Control-Allow-Origin' '*' always;
        
        # Reverse Proxy to the ehrbase container
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

# Disable the default Nginx site and enable our new one
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -s /etc/nginx/sites-available/ehrbase_api /etc/nginx/sites-enabled/

# Test and restart Nginx
sudo nginx -t
sudo systemctl restart nginx

# --- STEP 5: LAUNCH EHRBASE WITH DOCKER COMPOSE ---
echo "--- [6/6] Starting EHRbase application stack... (This may take a minute)"
sudo docker-compose up -d

# --- Final Output ---
PUBLIC_IP=$(curl -s ifconfig.me)
echo ""
echo "========================================================================"
echo "    EHRbase Installation Complete!"
echo "========================================================================"
echo ""
echo "Your API is now running and accessible at: http://${PUBLIC_IP}"
echo "Your API username is: ${EHRBASE_USER}"
echo "Your API password is: ${EHRBASE_PASSWORD}"
echo ""
echo "You can test it with the following command from your local machine:"
echo "curl -i http://${PUBLIC_IP}/ehrbase/rest/status -H \"Authorization: Basic \$(echo -n '${EHRBASE_USER}:${EHRBASE_PASSWORD}' | base64)\""
echo ""
