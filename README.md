# 🚀 Tailscale Funnel Manager v2.0

> **Modern Next.js interface for managing Tailscale Funnels with glassmorphism UI and seamless authentication**

A beautiful, modern web interface built with **Next.js 15** for creating and managing **Tailscale Funnels** in CasaOS environments. Features a stunning glassmorphism design, automatic container discovery, and browser-based authentication.

![Version](https://img.shields.io/badge/version-2.0.0-blue.svg)
![Next.js](https://img.shields.io/badge/Next.js-15-black.svg)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue.svg)
![Docker](https://img.shields.io/badge/Docker-supported-blue.svg)
![CasaOS](https://img.shields.io/badge/CasaOS-compatible-green.svg)

## ✨ What's New in v2.0

- 🎨 **Stunning Glassmorphism UI** - Modern, responsive design with beautiful gradients
- 🔗 **Browser Authentication** - No more complex Auth Key setup, just click and authenticate
- 🐳 **Smart Container Discovery** - Automatically detects Docker containers and CasaOS apps
- 📊 **Real-time Monitoring** - Live status updates via WebSocket connections
- 🌐 **Multi-language Support** - English and Portuguese interfaces
- 📱 **Mobile Responsive** - Perfect experience on all devices
- ⚡ **Lightning Fast** - Built with Next.js 15 and optimized for performance

## 🎯 Features

### 🔧 **Easy Setup**
- **Two authentication methods:**
  - 🔑 Traditional Auth Key input
  - 🌐 Browser-based login URL generation
- ⚡ One-click container discovery
- 🔄 Automatic service detection

### 🎨 **Modern Interface**
- ✨ Glassmorphism design with backdrop blur effects
- 🌈 Gradient backgrounds and smooth animations
- 📱 Fully responsive mobile design
- 🎭 Dark theme with purple/blue color scheme

### 🐳 **Container Management**
- 🔍 Auto-discovery of Docker containers
- 🏠 CasaOS apps integration
- 📊 Real-time status monitoring
- 🎯 One-click funnel creation

### 🔒 **Security & Authentication**
- 🛡️ Multiple auth methods (Tailscale/CasaOS/Custom)
- 🔐 Secure API endpoints
- 🌐 Tailscale network validation
- 📝 Session management

## 🚀 Quick Start

### 📦 Install via CasaOS App Store

1. Open your **CasaOS App Store**
2. Search for "**Tailscale Funnel Manager**"
3. Click **Install**
4. Access via `http://your-server:3000`

### 🐳 Docker Deployment

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
  ghcr.io/willianquintino/tailscale-funnel-manager:latest
```

### 🔧 Development Setup

```bash
# Clone the repository
git clone https://github.com/WillianQuintino/tailscale-funnel-manager.git
cd tailscale-funnel-manager

# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build
npm start
```

## 📖 Documentation

- 📋 **[Docker Guide](DOCKER.md)** - Complete Docker deployment instructions
- 🔐 **[Tailscale Login](TAILSCALE_LOGIN.md)** - Authentication setup guide
- 🏗️ **[Development](CONTRIBUTING.md)** - Contributing and development guide

## 🌟 Usage

### 1. **First Time Setup**

When you first access the interface:

1. 🌐 **Access**: `http://your-server:3000`
2. 🔧 **Choose setup method:**
   - 🔑 **Auth Key**: Enter your Tailscale auth key
   - 🌐 **Browser Login**: Click "Get Login URL" for easy setup

### 2. **Authentication Options**

#### 🔑 **Auth Key Method**
- Generate at [login.tailscale.com](https://login.tailscale.com/admin/settings/authkeys)
- Mark as "Reusable" and "Ephemeral"
- Paste into the interface

#### 🌐 **Browser Login Method**
- Click "Get Login URL"
- Copy or open the generated URL
- Complete authentication in browser
- Return and click "Verify Status"

### 3. **Managing Containers**

- 🔍 **Auto-discovery**: Containers appear automatically
- 🎯 **Create Funnels**: Click the port buttons for one-click creation
- 📊 **Monitor Status**: Real-time updates show connection status
- 🌍 **Access Services**: Use generated HTTPS URLs from anywhere

## 🛠️ Tech Stack

- **Framework**: Next.js 15 with App Router
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 4 with custom glassmorphism
- **Icons**: Lucide React
- **State Management**: TanStack Query (React Query)
- **Notifications**: Sonner
- **Forms**: React Hook Form + Zod validation
- **Deployment**: Docker with multi-stage builds

## 🏗️ Architecture

```
├── app/
│   ├── api/                 # API routes
│   │   ├── status/          # System status
│   │   ├── setup/           # Authentication setup
│   │   ├── funnels/         # Funnel management
│   │   └── tailscale/       # Tailscale integration
│   ├── components/          # React components
│   │   ├── Dashboard.tsx    # Main interface
│   │   ├── ServiceList.tsx  # Container listing
│   │   └── ConfigurationPanel.tsx
│   ├── lib/                 # Utilities
│   │   ├── docker-service.ts   # Docker integration
│   │   ├── casaos-auth.ts     # Authentication
│   │   └── tailscale-cli.ts   # Tailscale CLI wrapper
│   └── types/               # TypeScript definitions
├── scripts/                 # Deployment scripts
├── .github/workflows/       # CI/CD automation
└── docs/                    # Documentation
```

## 🔧 Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `NODE_ENV` | Environment | `production` |
| `TS_STATE_DIR` | Tailscale state directory | `/var/lib/tailscale` |
| `AUTH_ENABLED` | Enable authentication | `false` |
| `AUTH_TYPE` | Auth method | `tailscale` |
| `CASAOS_URL` | CasaOS URL | `http://localhost:80` |

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

1. 🍴 Fork the repository
2. 🔀 Create your feature branch (`git checkout -b feature/amazing-feature`)
3. 💾 Commit your changes (`git commit -m 'Add amazing feature'`)
4. 📤 Push to the branch (`git push origin feature/amazing-feature`)
5. 🔀 Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **[Tailscale](https://tailscale.com)** - For the amazing zero-config VPN
- **[CasaOS](https://casaos.io)** - For the beautiful home server OS
- **[Next.js](https://nextjs.org)** - For the incredible React framework
- **[Vercel](https://vercel.com)** - For the design inspiration

## 📞 Support

- 🐛 **Issues**: [GitHub Issues](https://github.com/WillianQuintino/tailscale-funnel-manager/issues)
- 💬 **Discussions**: [GitHub Discussions](https://github.com/WillianQuintino/tailscale-funnel-manager/discussions)
- 📧 **Email**: [your-email@domain.com](mailto:your-email@domain.com)

---

<div align="center">
  <strong>Made with ❤️ for the CasaOS community</strong>
  <br>
  <sub>Built by <a href="https://github.com/WillianQuintino">WillianQuintino</a></sub>
</div>