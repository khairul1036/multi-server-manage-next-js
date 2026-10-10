#!/usr/bin/env bash
# Script to generate Nginx reverse proxy configuration and reload Nginx
set -e

DOMAIN="$1"
PORT="$2"

if [ -z "$DOMAIN" ] || [ -z "$PORT" ]; then
  echo "Usage: $0 <domain> <port>"
  exit 1
fi

CONF_FILE="/etc/nginx/conf.d/${DOMAIN}.conf"

cat <<EOF > "$CONF_FILE"
server {
    listen 80;
    server_name ${DOMAIN};

    location / {
        proxy_pass http://127.0.0.1:${PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
EOF

nginx -t
systemctl reload nginx
echo "Nginx configured and reloaded for ${DOMAIN} -> ${PORT}"
