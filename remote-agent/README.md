# Remote VPS Worker Agent

This is the lightweight background worker agent that runs on every remote Linux VPS node to execute commands dispatched by the SaaS Master Control Plane.

## Capabilities
- **Health & Telemetry**: Reports CPU load, RAM usage, free memory, system uptime, and OS version to the Master server every minute.
- **Automated Domain & Nginx Routing**: Creates `/etc/nginx/conf.d/<domain>.conf` reverse proxy configurations and safely triggers `systemctl reload nginx`.
- **Tenant File Isolation**: Runs `useradd -m <username>` and enforces `chmod 700 /home/<username>`, ensuring strict privacy between tenants.

## Installation on Remote Ubuntu/Debian VPS

```bash
# 1. Install prerequisites
sudo apt update && sudo apt install -y curl nginx
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2

# 2. Deploy Agent to VPS
sudo mkdir -p /opt/vps-agent
sudo cp -r * /opt/vps-agent/
cd /opt/vps-agent

# 3. Setup .env file
sudo cp .env.example .env
sudo nano .env # set your AGENT_API_KEY

# 4. Install dependencies & run with PM2 under root
sudo npm install
sudo pm2 start agent.js --name "vps-agent"
sudo pm2 save
sudo pm2 startup
```
