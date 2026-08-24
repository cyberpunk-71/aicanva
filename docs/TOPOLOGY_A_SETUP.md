# Topology A (All-on-VPS) Setup Guide

> Complete step-by-step guide for deploying the Canvas Core Workspace on a VPS
> with Hermes/Eva local integration.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         YOUR VPS                                │
│                                                                 │
│  ┌──────────────────┐  ┌──────────────────┐  ┌──────────────┐  │
│  │  Canvas Frontend  │  │  Gateway Server  │  │   Skybridge  │  │
│  │  (Vite/React)     │  │  (Express+WS)    │  │   MCP Tools  │  │
│  │  Port 5173        │  │  Port 3001       │  │   (stdio)    │  │
│  └────────┬─────────┘  └────────┬─────────┘  └──────┬───────┘  │
│           │                     │                    │          │
│           │    WebSocket/HTTP   │     stdio          │          │
│           └─────────────────────┼────────────────────┘          │
│                                 │                               │
│                      ┌──────────▼──────────┐                    │
│                      │   Hermes / Eva      │                    │
│                      │   (Local Agent)     │                    │
│                      │   Port 8080         │                    │
│                      └─────────────────────┘                    │
└─────────────────────────────────────────────────────────────────┘
                    ▲
                    │ Browser (port 5173)
                    ▼
              ┌───────────┐
              │  Laptop    │
              │  Browser   │
              └───────────┘
```

**Key advantage:** All inter-agent communication happens locally over `localhost` with near-zero latency. You only need to open port 5173 (and optionally 3001) in your VPS firewall for browser access.

---

## Prerequisites

- A VPS running Ubuntu 20.04+ / Debian 11+ (or similar Linux)
- SSH access to the VPS
- At least 1GB RAM and 10GB disk space
- A domain name (optional, for reverse proxy with SSL)

---

## Step 1: Transfer the Workspace to Your VPS

### Option A: Git Clone (Recommended)

```bash
# SSH into your VPS
ssh user@your-vps-ip

# Clone the repository
cd /opt
git clone https://github.com/cyberpunk-71/aicanva.git canvas-workspace
cd canvas-workspace

# Switch to the deployment branch
git checkout arena/01a032e8-aicanva
```

### Option B: SCP Transfer

```bash
# From your local machine
scp -r /path/to/aicanva user@your-vps-ip:/opt/canvas-workspace

# Then SSH into the VPS
ssh user@your-vps-ip
cd /opt/canvas-workspace
```

---

## Step 2: Run the Setup Script

```bash
cd /opt/canvas-workspace

# Make the script executable
chmod +x scripts/setup-topology-a.sh

# Run the setup
./scripts/setup-topology-a.sh
```

The script will:
1. ✅ Install Node.js 20+ (if not present)
2. ✅ Install pnpm (if not present)
3. ✅ Install all workspace dependencies
4. ✅ Build all packages for production
5. ✅ Install PM2 process manager
6. ✅ Generate `.env` and Hermes config files
7. ✅ Start both services with PM2
8. ✅ Configure PM2 startup for reboot persistence

**Expected output:**
```
============================================
  ✅ Topology A Setup Complete!
============================================

  Services running:
    • canvas-gateway   → http://0.0.0.0:3001
    • canvas-frontend  → http://0.0.0.0:5173

  MCP Endpoints:
    • HTTP: http://localhost:3001/mcp
    • SSE:  http://localhost:3001/sse
    • WS:   ws://localhost:3001/ws

  Open in browser:
    → http://YOUR_VPS_IP:5173
```

---

## Step 3: Configure the VPS Firewall

If you're using `ufw` (Ubuntu's default firewall):

```bash
# Allow SSH (if not already allowed)
sudo ufw allow 22/tcp

# Allow Canvas Frontend (for browser access)
sudo ufw allow 5173/tcp

# Allow Gateway API (optional — only if you need remote API access)
sudo ufw allow 3001/tcp

# Enable the firewall (if not already enabled)
sudo ufw enable

# Verify rules
sudo ufw status
```

**Minimal setup:** You only need port 5173 open for browser access. Port 3001 is only needed if you want to access the Gateway API remotely (Hermes/Eva connects to it locally via `localhost`).

---

## Step 4: Link Hermes / Eva with the Generated Config

The setup script generates configuration files in `/opt/canvas-workspace/config/`:

### Option A: YAML Config (for Hermes config.yaml)

```bash
# View the generated config
cat /opt/canvas-workspace/config/hermes-canvas.yaml
```

Copy the `mcp_servers` section and paste it into your Hermes `config.yaml`:

```yaml
# Add to your Hermes config.yaml:
mcp_servers:
  canvas_workspace:
    url: "http://localhost:3001/mcp"
    transport: "http"
  skybridge_tools:
    command: "node"
    args: ["/opt/canvas-workspace/apps/skybridge-mcp/dist/server/index.js"]
```

### Option B: JSON Config (for mcp_servers.json)

```bash
# View the generated config
cat /opt/canvas-workspace/config/hermes-canvas.json
```

Copy this file to your Hermes config directory:

```bash
cp /opt/canvas-workspace/config/hermes-canvas.json ~/.hermes/mcp_servers.json
```

### Restart Hermes

```bash
# Restart Hermes to pick up the new MCP servers
# (command depends on your Hermes installation)
sudo systemctl restart hermes
# or
pm2 restart hermes
```

---

## Step 5: Open the Canvas in Your Browser

1. Open your browser on your laptop
2. Navigate to: `http://YOUR_VPS_IP:5173`
3. You should see the infinite canvas with the toolbar at the top

### Quick Verification

```bash
# Test the gateway health endpoint
curl http://YOUR_VPS_IP:3001/health

# Test creating a card via MCP
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"create_canvas_card","arguments":{"type":"chat","label":"Hello from Hermes!"}}'

# List available MCP tools
curl http://localhost:3001/mcp/tools
```

---

## PM2 Management Commands

```bash
# View service status
pm2 status

# View logs (all services)
pm2 logs

# View logs for specific service
pm2 logs canvas-gateway
pm2 logs canvas-frontend

# Restart all services
pm2 restart all

# Restart specific service
pm2 restart canvas-gateway

# Stop all services
pm2 stop all

# Real-time monitoring
pm2 monit

# Save current process list (for auto-restart on reboot)
pm2 save

# Reload services (zero-downtime restart)
pm2 reload all
```

---

## Optional: Nginx Reverse Proxy with SSL

For production deployments with a domain name:

```bash
# Install Nginx and Certbot
sudo apt install -y nginx certbot python3-certbot-nginx

# Create Nginx config
sudo tee /etc/nginx/sites-available/canvas << 'EOF'
server {
    listen 80;
    server_name canvas.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:5173;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /ws {
        proxy_pass http://127.0.0.1:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /mcp {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    location /sse {
        proxy_pass http://127.0.0.1:3001;
        proxy_set_header Host $host;
        proxy_buffering off;
        proxy_cache off;
        proxy_set_header Connection '';
        proxy_http_version 1.1;
        chunked_transfer_encoding off;
    }
}
EOF

# Enable the site
sudo ln -s /etc/nginx/sites-available/canvas /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx

# Get SSL certificate
sudo certbot --nginx -d canvas.yourdomain.com
```

---

## Troubleshooting

### Services not starting

```bash
# Check PM2 logs for errors
pm2 logs --lines 50

# Check if ports are in use
sudo lsof -i :3001
sudo lsof -i :5173

# Restart services
pm2 restart all
```

### Can't access from browser

```bash
# Check firewall
sudo ufw status

# Check if services are listening on 0.0.0.0
pm2 status

# Test locally first
curl http://localhost:5173
curl http://localhost:3001/health
```

### Hermes can't connect to MCP

```bash
# Verify gateway is running
curl http://localhost:3001/health

# Test MCP endpoint directly
curl -X POST http://localhost:3001/mcp \
  -H "Content-Type: application/json" \
  -d '{"tool":"get_canvas_state","arguments":{}}'

# Check Hermes logs
pm2 logs hermes --lines 20
```

### Data persistence

Canvas data is stored in `/opt/canvas-workspace/server/data/canvas.json`. To backup:

```bash
cp /opt/canvas-workspace/server/data/canvas.json ~/canvas-backup-$(date +%Y%m%d).json
```

---

## File Locations Reference

| Item | Path |
|------|------|
| Workspace root | `/opt/canvas-workspace` |
| Gateway server | `/opt/canvas-workspace/server/dist/index.js` |
| Frontend build | `/opt/canvas-workspace/apps/web-canvas/dist/` |
| Skybridge MCP | `/opt/canvas-workspace/apps/skybridge-mcp/dist/server/index.js` |
| Canvas data | `/opt/canvas-workspace/server/data/canvas.json` |
| Environment | `/opt/canvas-workspace/.env` |
| PM2 config | `/opt/canvas-workspace/pm2.config.js` |
| Hermes YAML | `/opt/canvas-workspace/config/hermes-canvas.yaml` |
| Hermes JSON | `/opt/canvas-workspace/config/hermes-canvas.json` |
| Logs | `/opt/canvas-workspace/logs/` |
| Setup script | `/opt/canvas-workspace/scripts/setup-topology-a.sh` |
| Hermes config script | `/opt/canvas-workspace/scripts/configure-hermes.sh` |
