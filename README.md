# VPS Master - Multi-Server SaaS Management Platform

A modern, centralized **Master-Worker Architecture** SaaS control plane to manage multiple remote Linux VPS nodes, automated Nginx reverse proxy routing, and privacy-isolated tenant environments.

---

## 🌟 System Architecture Overview

```text
 ┌─────────────────────────────────────────────────────────────┐
 │               MASTER CONTROL PLANE (Central Server)         │
 │  Next.js 16 (App Router) + Tailwind CSS + MongoDB + JWT      │
 └──────────────┬───────────────────────────────┬──────────────┘
                │ HTTP API Calls (Agent Key)   │
       ┌────────┴────────┐             ┌────────┴────────┐
       ▼                 ▼             ▼                 ▼
 ┌─────────────┐   ┌─────────────┐   ┌─────────────┐   ┌─────────────┐
 │ Remote VPS 1│   │ Remote VPS 2│   │ Remote VPS 3│   │ Remote VPS n│
 │ Worker Node │   │ Worker Node │   │ Worker Node │   │ Worker Node │
 │ (Port 4000) │   │ (Port 4000) │   │ (Port 4000) │   │ (Port 4000) │
 └─────────────┘   └─────────────┘   └─────────────┘   └─────────────┘
```

- **Master Server**: Handles user authentication, Super Admin seeding, fleet dashboard, server telemetry monitoring, and dispatches remote provisioning commands.
- **Remote Worker Node (`remote-agent`)**: A lightweight background Node.js service running under PM2 on each Linux VPS with root permissions to manage `useradd -m` (with `chmod 700`), write `/etc/nginx/conf.d/<domain>.conf`, and reload Nginx.

---

## 📋 System Requirements

| Component | Minimum Specification | Recommended Specification |
| :--- | :--- | :--- |
| **Master Server OS** | Ubuntu 20.04 / 22.04 / 24.04 LTS | Ubuntu 22.04 LTS |
| **Master Server RAM** | 1 GB RAM | 2 GB+ RAM |
| **Remote VPS Nodes** | Any Linux (Ubuntu / Debian / CentOS) | Ubuntu 22.04 LTS |
| **Node.js** | v20.x or v22.x LTS | v22.x LTS |
| **Database** | MongoDB 6.0+ (Local or Atlas) | MongoDB 7.0 Community / Atlas |
| **Process Manager**| PM2 | PM2 (`npm i -g pm2`) |

---

## 🚀 PART 1: Master Server Production Deployment

### 1. Install Node.js, Git, and Nginx on the Master VPS
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl git nginx

# Install Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 globally
sudo npm install -g pm2
```

### 2. Set Up MongoDB
Choose either **Local MongoDB** or **MongoDB Atlas**:

#### Option A: Local MongoDB (Self-hosted)
```bash
sudo apt install -y gnupg curl
curl -fsSL https://www.mongodb.org/static/pgp/server-7.0.asc | sudo gpg -o /usr/share/keyrings/mongodb-server-7.0.gpg --dearmor
echo "deb [ arch=amd64,arm64 signed-by=/usr/share/keyrings/mongodb-server-7.0.gpg ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list
sudo apt update
sudo apt install -y mongodb-org
sudo systemctl enable --now mongod
```
Your URI: `mongodb://127.0.0.1:27017/multi_vps_db`

#### Option B: MongoDB Atlas (Cloud)
Create a free cluster at [cloud.mongodb.com](https://cloud.mongodb.com) and get your connection string:
`mongodb+srv://<username>:<password>@cluster0.mongodb.net/multi_vps_db?retryWrites=true&w=majority`

---

### 3. Clone and Configure the Master Application
```bash
# Clone or copy codebase
sudo mkdir -p /var/www/vps-master
sudo chown -R $USER:$USER /var/www/vps-master
cd /var/www/vps-master

# Copy project files here
git clone <your-repository-url> .

# Install dependencies
npm install
```

### 4. Configure Production Environment Variables
Create `.env.local` inside `/var/www/vps-master`:
```bash
nano .env.local
```

Paste your configuration:
```env
# MongoDB Connection
MONGODB_URI=mongodb://127.0.0.1:27017/multi_vps_db

# Cryptographically Secure JWT Secret (64 hex characters)
JWT_SECRET=786a42cef7e2f2c0227220405a0b3e4d6844fc2a7256bb8f36a7af20c507f013

# Super Admin Account (Automatically created on initial startup)
SUPER_ADMIN_NAME=Super Administrator
SUPER_ADMIN_EMAIL=admin@saas.com
SUPER_ADMIN_PASS=Admin123456!

# Master Server Settings
NODE_ENV=production
NEXT_PUBLIC_APP_URL=https://master.yourdomain.com
MASTER_SERVER_HOST=YOUR_MASTER_PUBLIC_IP
PORT=3000

# Worker Node Agent Defaults
NEXT_PUBLIC_MASTER_IP=YOUR_MASTER_PUBLIC_IP
NEXT_PUBLIC_AGENT_PORT=4000
NEXT_PUBLIC_DEFAULT_AGENT_KEY=2fd8f476e69892f9a801799196cc4d195cdebe4852c068ea310bf4623176013b
```

### 5. Build and Start the Master Server with PM2
```bash
# Compile optimized Next.js production build
npm run build

# Start Next.js with PM2
pm2 start npm --name "vps-master" -- start

# Configure PM2 to start on server boot
pm2 save
pm2 startup
```

---

### 6. Configure Nginx Reverse Proxy with SSL on Master
Create an Nginx server block:
```bash
sudo nano /etc/nginx/sites-available/vps-master
```

Add the following:
```nginx
server {
    listen 80;
    server_name master.yourdomain.com; # Or your server's public IP

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
    }
}
```

Enable site and test configuration:
```bash
sudo ln -s /etc/nginx/sites-available/vps-master /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

Install free Let's Encrypt SSL:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d master.yourdomain.com
```

---

## 🛠️ PART 2: Remote Worker Node (Agent) Deployment

Run these steps on **each remote Linux VPS** that you want to manage:

### 1. Install Node.js, Nginx, and PM2 on the Remote Node
```bash
sudo apt update && sudo apt install -y curl nginx
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
sudo npm install -g pm2
```

### 2. Copy the `remote-agent` Folder to the Remote VPS
From your master server or local computer:
```bash
# Create directory on remote VPS
sudo mkdir -p /opt/vps-agent
sudo chown -R $USER:$USER /opt/vps-agent

# Copy files (via rsync/scp or git)
# Example using scp from local machine:
# scp -r ./remote-agent/* root@REMOTE_VPS_IP:/opt/vps-agent/
```

### 3. Configure the Agent Environment
Inside `/opt/vps-agent/`:
```bash
cd /opt/vps-agent
cp .env.example .env
nano .env
```

Ensure the values match:
```env
AGENT_PORT=4000
AGENT_API_KEY=2fd8f476e69892f9a801799196cc4d195cdebe4852c068ea310bf4623176013b
MASTER_IP=YOUR_MASTER_PUBLIC_IP
```

### 4. Install Dependencies & Start with PM2 under Root
> [!IMPORTANT]
> The worker agent **must run under root / sudo** so it has permission to execute `useradd -m <username>`, set `chmod 700 /home/<username>`, and write `/etc/nginx/conf.d/<domain>.conf`.

```bash
cd /opt/vps-agent
npm install

# Start under root
sudo pm2 start agent.js --name "vps-agent"
sudo pm2 save
sudo pm2 startup
```

### 5. Allow Agent Port in Firewall
```bash
# Allow agent port from Master server only (Best security)
sudo ufw allow from YOUR_MASTER_PUBLIC_IP to any port 4000 proto tcp

# Or allow universally:
# sudo ufw allow 4000/tcp
sudo ufw reload
```

---

## 🔑 PART 3: First Login & Super Admin Setup

1. Open your browser and navigate to: `http://localhost:3000/login` (or `https://master.yourdomain.com/login`).
2. Click the **"Run Seed Admin & Auto-Fill"** button.
   - The database seeder will automatically execute `POST /api/auth/seed`.
   - The Super Admin account (`admin@saas.com` / `Admin123456!`) will be created and auto-filled.
3. Click **"Sign In"**.
4. You will be redirected to the Master Control Plane Dashboard!

---

## 🖥️ PART 4: Adding Servers and Domains

### 1. Connect a Remote VPS
1. Go to **VPS Servers** (`/servers`) or click **"Connect VPS"** on the dashboard.
2. Enter:
   - **Server Name**: e.g., `Production US-East Node 1`
   - **IP Address**: Remote VPS public IP
   - **SSH Port**: `22` (or your custom SSH port)
   - **Agent Port**: `4000`
   - **Agent API Key**: Pre-filled from `.env.local`
3. Click **"Connect Server"**. The Master will ping `/health` on the agent and confirm the connection.

### 2. Create Isolated Tenant User
1. Go to **User Isolation** (`/users`) -> **"Create Tenant"**.
2. Enter:
   - Name & Email
   - Password
   - **Linux Username**: e.g. `client_alpha`
   - Select the target VPS server.
3. Click **"Create Isolated User"**.
   - The remote agent executes `useradd -m -s /bin/bash client_alpha`
   - Applies strict zero-trust permission: `chmod 700 /home/client_alpha`.

### 3. Add Custom Domain with Automated Nginx Proxy
1. Point your domain's DNS `A Record` to the Remote VPS IP.
2. Go to **Domain Routing** (`/domains`) -> **"Add New Domain"**.
3. Enter:
   - **Domain Name**: e.g. `client.example.com`
   - **Target Port**: e.g. `3000` (internal application port)
   - **Target VPS**: Select the connected server.
4. Click **"Deploy Reverse Proxy"**.
   - Remote agent creates `/etc/nginx/conf.d/client.example.com.conf`.
   - Tests and reloads Nginx (`nginx -t && systemctl reload nginx`).
   - Domain is instantly live!

---

## 📊 Useful PM2 Commands

```bash
# Check running services
pm2 status

# View live application logs
pm2 logs vps-master     # On Master
pm2 logs vps-agent      # On Remote VPS

# Restart services
pm2 restart vps-master
pm2 restart vps-agent
```

---

## ⚡ PART 5: Automated User Hosting, Auto-Port Assignment & Domain Mapping

The system replicates the automated hosting workflow shown in the control dashboard:

### 1. Automated Port Assignment (Ports `8081` - `8150`)
- Whenever a user is created via the dashboard or API, the system automatically scans active users and assigns the next sequential available port starting at `8081`.
- The Remote Worker Node (`remote-agent/agent.js`) stores state in `users_meta.json`.
- A background web server (Python/Node) is automatically launched on that port bound to the user's home directory (`/home/<username>`).

### 2. Website URL & SSH Quick Access
- Click any row in the **System Users** table to open the **User Details Modal**:
  - **Website URL**: `http://<vps_ip>:<port>` (clickable link to their live site)
  - **SSH Login**: Ready-to-copy command: `ssh <username>@<vps_ip>`
  - **Password**: Displayed with 1-click clipboard copy
  - **Live Storage Quota**: Shows used MB vs allocated MB limit
  - **Regenerate Password**: Instantly resets Linux credentials via `chpasswd`

### 3. Tenant Custom Domain Self-Service
- Tenants or Admins can click **"Connect Domain"** directly from the User Modal.
- The user's auto-assigned hosting port (e.g., `8081`, `8082`, etc.) is **automatically pre-selected**.
- Point the domain's DNS `A Record` to the VPS IP, enter the domain name, and click **"Deploy Reverse Proxy"**.
- Nginx automatically routes HTTP traffic from `http://<custom_domain>` directly to the user's allocated internal hosting port!

---

## 🔒 Security Best Practices
- **Never expose Agent port 4000 publicly without API key**: Always maintain a strong `AGENT_API_KEY` (minimum 32+ characters) and set `MASTER_IP` to restrict incoming connections.
- **Strict User Isolation**: All tenant directories are locked with `chmod 700` preventing cross-user traversal.
- **Input Validation**: All usernames, domain names, and IP addresses are strictly validated via Zod schemas to eliminate Linux shell injection attacks.
