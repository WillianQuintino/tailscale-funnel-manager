#!/bin/bash

# Tailscale Funnel Manager para CasaOS - Script de Instalação
# Autor: Claude Code Assistant
# Versão: 1.0

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configurações
CONTAINER_NAME="tailscale-funnel-manager"
IMAGE_NAME="tailscale-funnel-manager"
DATA_DIR="/opt/casaos/tailscale-funnel"
WEB_PORT="8080"
REPO_URL="https://github.com/seu-usuario/tailscale-funnel-manager"

# Funções auxiliares
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verificar se está rodando como root ou com sudo
check_permissions() {
    if [ "$EUID" -ne 0 ]; then
        log_error "Este script precisa ser executado como root ou com sudo"
        exit 1
    fi
}

# Verificar dependências
check_dependencies() {
    log_info "Verificando dependências..."

    # Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker não está instalado. Por favor, instale o Docker primeiro."
        exit 1
    fi

    # Docker Compose (opcional, mas recomendado)
    if ! command -v docker-compose &> /dev/null; then
        log_warning "Docker Compose não encontrado. Recomendamos instalar para melhor gerenciamento."
    fi

    # Git (para baixar o código)
    if ! command -v git &> /dev/null; then
        log_error "Git não está instalado. Por favor, instale o Git primeiro."
        exit 1
    fi

    log_success "Dependências verificadas"
}

# Verificar se CasaOS está instalado
check_casaos() {
    log_info "Verificando instalação do CasaOS..."

    if [ -d "/opt/casaos" ] || [ -d "/usr/share/casaos" ]; then
        log_success "CasaOS detectado"
    else
        log_warning "CasaOS não detectado. Este container funcionará, mas algumas funcionalidades podem ser limitadas."
    fi
}

# Criar diretórios necessários
create_directories() {
    log_info "Criando diretórios necessários..."

    mkdir -p "$DATA_DIR"
    mkdir -p "$DATA_DIR/data"
    mkdir -p "$DATA_DIR/tailscale"

    # Definir permissões apropriadas
    chown -R 1000:1000 "$DATA_DIR"

    log_success "Diretórios criados em $DATA_DIR"
}

# Baixar código fonte
download_source() {
    log_info "Baixando código fonte..."

    if [ -d "$DATA_DIR/source" ]; then
        rm -rf "$DATA_DIR/source"
    fi

    # Se não conseguir clonar do GitHub, criar arquivos localmente
    if ! git clone "$REPO_URL" "$DATA_DIR/source" 2>/dev/null; then
        log_warning "Não foi possível baixar do GitHub. Usando arquivos locais..."

        # Copiar arquivos se estiver no diretório correto
        if [ -f "Dockerfile" ]; then
            cp -r . "$DATA_DIR/source/"
        else
            log_error "Arquivos fonte não encontrados. Por favor, baixe manualmente ou execute do diretório correto."
            exit 1
        fi
    fi

    log_success "Código fonte baixado"
}

# Construir imagem Docker
build_image() {
    log_info "Construindo imagem Docker..."

    cd "$DATA_DIR/source"

    if docker build -t "$IMAGE_NAME" .; then
        log_success "Imagem Docker construída com sucesso"
    else
        log_error "Falha ao construir imagem Docker"
        exit 1
    fi
}

# Parar container existente se estiver rodando
stop_existing_container() {
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_info "Parando container existente..."
        docker stop "$CONTAINER_NAME" && docker rm "$CONTAINER_NAME"
        log_success "Container existente removido"
    fi
}

# Criar e iniciar container
start_container() {
    log_info "Iniciando container Tailscale Funnel Manager..."

    docker run -d \
        --name "$CONTAINER_NAME" \
        --restart unless-stopped \
        -p "$WEB_PORT:8080" \
        -v "$DATA_DIR/data:/app/data" \
        -v "$DATA_DIR/tailscale:/var/lib/tailscale" \
        -v /var/run/docker.sock:/var/run/docker.sock \
        --net=host \
        --privileged \
        "$IMAGE_NAME"

    # Verificar se o container está rodando
    sleep 5
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_success "Container iniciado com sucesso"
    else
        log_error "Falha ao iniciar container"
        docker logs "$CONTAINER_NAME"
        exit 1
    fi
}

# Criar docker-compose.yml para facilitar gerenciamento
create_compose_file() {
    log_info "Criando arquivo docker-compose.yml..."

    cat > "$DATA_DIR/docker-compose.yml" << EOF
version: '3.8'

services:
  tailscale-funnel-manager:
    image: $IMAGE_NAME
    container_name: $CONTAINER_NAME
    restart: unless-stopped
    ports:
      - "$WEB_PORT:8080"
    volumes:
      - $DATA_DIR/data:/app/data
      - $DATA_DIR/tailscale:/var/lib/tailscale
      - /var/run/docker.sock:/var/run/docker.sock
    network_mode: host
    privileged: true
    environment:
      - TZ=America/Sao_Paulo
EOF

    log_success "Arquivo docker-compose.yml criado em $DATA_DIR"
}

# Criar CasaOS app manifest (se CasaOS estiver presente)
create_casaos_manifest() {
    if [ -d "/opt/casaos" ] || [ -d "/usr/share/casaos" ]; then
        log_info "Criando manifest para CasaOS..."

        cat > "$DATA_DIR/casaos-app.json" << EOF
{
    "version": "1.0",
    "title": "Tailscale Funnel Manager",
    "name": "tailscale-funnel-manager",
    "icon": "https://tailscale.com/favicon.ico",
    "tagline": "Gerencie Tailscale Funnels para seus containers CasaOS",
    "overview": "Interface web para criar e gerenciar Tailscale Funnels, permitindo expor seus serviços CasaOS para a internet de forma segura.",
    "thumbnail": "",
    "screenshots": [],
    "category": "Network",
    "developer": {
        "name": "Community",
        "website": "",
        "donate_text": "",
        "donate_link": ""
    },
    "adaptor": {
        "name": "tailscale-funnel-manager",
        "image": "$IMAGE_NAME",
        "index": "/",
        "port": "8080",
        "scheme": "http",
        "network_model": "host"
    },
    "support": "",
    "website": "",
    "container": {
        "image": "$IMAGE_NAME",
        "shell": "sh",
        "privileged": true,
        "network_model": "host",
        "web_ui": {
            "http": "$WEB_PORT",
            "path": "/"
        },
        "health_check": "",
        "envs": [],
        "ports": [
            {
                "container": "8080",
                "host": "$WEB_PORT",
                "type": "tcp",
                "allocation": "required",
                "configurable": "basic",
                "description": "WebUI HTTP Port"
            }
        ],
        "volumes": [
            {
                "container": "/app/data",
                "host": "$DATA_DIR/data",
                "mode": "rw",
                "allocation": "required",
                "configurable": "basic",
                "description": "Configurações e dados"
            },
            {
                "container": "/var/lib/tailscale",
                "host": "$DATA_DIR/tailscale",
                "mode": "rw",
                "allocation": "required",
                "configurable": "basic",
                "description": "Estado do Tailscale"
            },
            {
                "container": "/var/run/docker.sock",
                "host": "/var/run/docker.sock",
                "mode": "rw",
                "allocation": "required",
                "configurable": "no",
                "description": "Socket do Docker"
            }
        ],
        "devices": [],
        "constraints": {
            "min_memory": 128,
            "min_storage": 1024
        },
        "restart_policy": "unless-stopped",
        "sysctls": [],
        "cap_add": [],
        "labels": []
    }
}
EOF

        log_success "Manifest CasaOS criado"
    fi
}

# Mostrar informações de acesso
show_access_info() {
    log_success "Instalação concluída com sucesso!"
    echo
    echo "=================================="
    echo "   TAILSCALE FUNNEL MANAGER"
    echo "=================================="
    echo
    echo "🌐 Interface Web:"
    echo "   http://localhost:$WEB_PORT"
    echo "   http://$(hostname -I | awk '{print $1}'):$WEB_PORT"
    echo
    echo "📁 Dados armazenados em:"
    echo "   $DATA_DIR"
    echo
    echo "🐳 Gerenciar container:"
    echo "   docker logs $CONTAINER_NAME"
    echo "   docker restart $CONTAINER_NAME"
    echo "   docker stop $CONTAINER_NAME"
    echo
    echo "🔧 Docker Compose:"
    echo "   cd $DATA_DIR"
    echo "   docker-compose up -d"
    echo "   docker-compose logs -f"
    echo
    echo "📋 Próximos passos:"
    echo "   1. Acesse a interface web"
    echo "   2. Insira seu token Tailscale"
    echo "   3. Gerencie seus funnels!"
    echo
    echo "🔗 Obter token Tailscale:"
    echo "   https://login.tailscale.com/admin/settings/keys"
    echo
}

# Função principal
main() {
    echo "======================================================="
    echo "  Tailscale Funnel Manager para CasaOS - Instalador"
    echo "======================================================="
    echo

    check_permissions
    check_dependencies
    check_casaos
    create_directories
    download_source
    build_image
    stop_existing_container
    start_container
    create_compose_file
    create_casaos_manifest
    show_access_info
}

# Executar instalação
main "$@"