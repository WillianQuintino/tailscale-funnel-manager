#!/bin/bash

# Script de inicialização para Tailscale Funnel Manager
set -e

echo "🚀 Starting Tailscale Funnel Manager..."

# Criar diretórios necessários
mkdir -p /var/lib/tailscale
mkdir -p /app/data

# Configurar permissões
chown -R 1000:1000 /app/data 2>/dev/null || true
chown -R 1000:1000 /var/lib/tailscale 2>/dev/null || true

# Verificar se Tailscale está instalado
if ! command -v tailscale &> /dev/null; then
    echo "⚠️  Tailscale not found, installing..."
    curl -fsSL https://tailscale.com/install.sh | sh
fi

# Verificar se Docker CLI está disponível
if ! command -v docker &> /dev/null; then
    echo "⚠️  Docker CLI not found, please mount /var/run/docker.sock"
fi

# Inicializar Tailscale daemon em background se não estiver rodando
if ! pgrep tailscaled > /dev/null; then
    echo "🔧 Starting Tailscale daemon..."
    tailscaled --state-dir=/var/lib/tailscale --tun=userspace-networking &
    sleep 3
fi

# Verificar variáveis de ambiente essenciais
export TS_STATE_DIR=${TS_STATE_DIR:-/var/lib/tailscale}
export NODE_ENV=${NODE_ENV:-production}
export AUTH_ENABLED=${AUTH_ENABLED:-false}
export AUTH_TYPE=${AUTH_TYPE:-tailscale}

echo "📊 Environment:"
echo "  TS_STATE_DIR: $TS_STATE_DIR"
echo "  NODE_ENV: $NODE_ENV"
echo "  AUTH_ENABLED: $AUTH_ENABLED"
echo "  AUTH_TYPE: $AUTH_TYPE"

# Verificar se é primeira execução
if [ ! -f "/var/lib/tailscale/tailscaled.state" ]; then
    echo "🎉 First run detected - you'll need to authenticate Tailscale"
    echo "   Use the web interface to configure your Auth Key or get login URL"
fi

echo "🌐 Starting Next.js application..."

# Iniciar a aplicação Next.js
exec npm start