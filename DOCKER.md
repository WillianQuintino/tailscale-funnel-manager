# 🐳 Docker Deployment Guide

## Quick Start with CasaOS

1. **Install from CasaOS App Store:**
   - Open CasaOS App Store
   - Search for "Tailscale Funnel Manager"
   - Click Install
   - Access via `http://your-server:3000`

## Manual Docker Deployment

### Using Docker Compose

```yaml
version: '3.8'

services:
  tailscale-funnel-manager:
    image: ghcr.io/willianquintino/tailscale-funnel-manager:latest
    container_name: tailscale-funnel-manager
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - ./data:/app/data
      - ./tailscale:/var/lib/tailscale
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - /dev/net/tun:/dev/net/tun
    cap_add:
      - NET_ADMIN
      - NET_RAW
    privileged: true
    network_mode: host
    environment:
      - NODE_ENV=production
      - TS_STATE_DIR=/var/lib/tailscale
      - AUTH_ENABLED=false
      - AUTH_TYPE=tailscale
```

### Using Docker CLI

```bash
docker run -d \
  --name tailscale-funnel-manager \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/tailscale:/var/lib/tailscale \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /dev/net/tun:/dev/net/tun \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --privileged \
  --network host \
  -e NODE_ENV=production \
  -e TS_STATE_DIR=/var/lib/tailscale \
  -e AUTH_ENABLED=false \
  -e AUTH_TYPE=tailscale \
  ghcr.io/willianquintino/tailscale-funnel-manager:latest
```

## Building from Source

```bash
# Clone the repository
git clone https://github.com/WillianQuintino/tailscale-funnel-manager.git
cd tailscale-funnel-manager

# Build the image
docker build -t tailscale-funnel-manager .

# Run the container
docker run -d \
  --name tailscale-funnel-manager \
  --restart unless-stopped \
  -p 3000:3000 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/tailscale:/var/lib/tailscale \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /dev/net/tun:/dev/net/tun \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --privileged \
  --network host \
  tailscale-funnel-manager
```

## Required Volumes

| Volume | Purpose | Required |
|--------|---------|----------|
| `/app/data` | Application data and configuration | ✅ |
| `/var/lib/tailscale` | Tailscale state and authentication | ✅ |
| `/var/run/docker.sock` | Docker container discovery | ✅ |
| `/dev/net/tun` | TUN device for Tailscale | ✅ |

## Required Capabilities

| Capability | Purpose | Required |
|------------|---------|----------|
| `NET_ADMIN` | Network administration | ✅ |
| `NET_RAW` | Raw socket access | ✅ |
| `--privileged` | Full system access for Tailscale | ✅ |
| `--network host` | Host network access | ✅ |

## Environment Variables

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `NODE_ENV` | Node.js environment | `production` | `production`, `development` |
| `TS_STATE_DIR` | Tailscale state directory | `/var/lib/tailscale` | Any valid path |
| `AUTH_ENABLED` | Enable authentication | `false` | `true`, `false` |
| `AUTH_TYPE` | Authentication method | `tailscale` | `tailscale`, `casaos`, `custom` |
| `CASAOS_URL` | CasaOS URL (if using CasaOS auth) | `http://localhost:80` | Any valid URL |
| `CUSTOM_USERNAME` | Custom auth username | `admin` | Any string |
| `CUSTOM_PASSWORD` | Custom auth password | `admin` | Any string |

## Health Check

The container includes a built-in health check that monitors:
- Application startup (30s timeout)
- API availability (`/api/tailscale/status`)
- Container responsiveness

## Troubleshooting

### Container won't start
```bash
# Check logs
docker logs tailscale-funnel-manager

# Common issues:
# 1. Missing TUN device
# 2. Insufficient privileges
# 3. Docker socket not accessible
```

### Tailscale authentication fails
```bash
# Check if Tailscale daemon is running
docker exec tailscale-funnel-manager tailscale status

# Check logs for authentication URLs
docker logs tailscale-funnel-manager | grep "https://login.tailscale.com"
```

### Container discovery not working
```bash
# Verify Docker socket mount
docker exec tailscale-funnel-manager ls -la /var/run/docker.sock

# Test Docker CLI access
docker exec tailscale-funnel-manager docker ps
```

## Security Considerations

⚠️ **Important Security Notes:**

1. **Privileged Mode**: Required for Tailscale networking
2. **Docker Socket**: Gives container access to manage other containers
3. **Host Network**: Container shares host network stack
4. **TUN Device**: Required for VPN functionality

These permissions are necessary for Tailscale Funnel functionality but should be used only on trusted systems.

## Multi-Architecture Support

The Docker image supports:
- ✅ `linux/amd64` (x86_64)
- ✅ `linux/arm64` (ARM 64-bit)

Built automatically via GitHub Actions with multi-platform support.

## Updates

```bash
# Pull latest image
docker pull ghcr.io/willianquintino/tailscale-funnel-manager:latest

# Stop and remove old container
docker stop tailscale-funnel-manager
docker rm tailscale-funnel-manager

# Start new container with same configuration
# (Use your original docker run command)
```

## Development

```bash
# Run in development mode
docker run -d \
  --name tailscale-funnel-manager-dev \
  -p 3000:3000 \
  -v $(pwd):/app \
  -v $(pwd)/tailscale:/var/lib/tailscale \
  -v /var/run/docker.sock:/var/run/docker.sock:ro \
  -v /dev/net/tun:/dev/net/tun \
  --cap-add NET_ADMIN \
  --cap-add NET_RAW \
  --privileged \
  --network host \
  -e NODE_ENV=development \
  -w /app \
  node:18-alpine \
  sh -c "npm install && npm run dev"
```