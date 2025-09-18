#!/bin/bash

# Script de Backup e Restore para Tailscale Funnel Manager
# Versão: 1.0

set -e

CONTAINER_NAME="tailscale-funnel-manager"
DATA_DIR="/opt/casaos/tailscale-funnel"
BACKUP_DIR="/opt/casaos/backups/tailscale-funnel"
DATE=$(date +%Y%m%d_%H%M%S)

# Cores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

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

# Função de backup
backup() {
    log_info "Iniciando backup do Tailscale Funnel Manager..."

    # Criar diretório de backup
    mkdir -p "$BACKUP_DIR"

    # Nome do arquivo de backup
    BACKUP_FILE="$BACKUP_DIR/tailscale-funnel-backup-$DATE.tar.gz"

    # Parar container temporariamente para backup consistente
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_info "Parando container para backup..."
        docker stop "$CONTAINER_NAME"
        RESTART_CONTAINER=true
    else
        RESTART_CONTAINER=false
    fi

    # Criar backup
    log_info "Criando arquivo de backup..."
    tar -czf "$BACKUP_FILE" -C "$DATA_DIR" . 2>/dev/null || {
        log_error "Falha ao criar backup"
        if [ "$RESTART_CONTAINER" = true ]; then
            docker start "$CONTAINER_NAME"
        fi
        exit 1
    }

    # Reiniciar container se estava rodando
    if [ "$RESTART_CONTAINER" = true ]; then
        log_info "Reiniciando container..."
        docker start "$CONTAINER_NAME"
    fi

    # Verificar backup
    if [ -f "$BACKUP_FILE" ]; then
        BACKUP_SIZE=$(du -h "$BACKUP_FILE" | cut -f1)
        log_success "Backup criado: $BACKUP_FILE ($BACKUP_SIZE)"
    else
        log_error "Falha ao criar backup"
        exit 1
    fi

    # Limpar backups antigos (manter últimos 7)
    log_info "Limpando backups antigos..."
    find "$BACKUP_DIR" -name "tailscale-funnel-backup-*.tar.gz" -type f -mtime +7 -delete 2>/dev/null || true

    log_success "Backup concluído com sucesso!"
}

# Função de restore
restore() {
    local backup_file="$1"

    if [ -z "$backup_file" ]; then
        log_error "Por favor, especifique o arquivo de backup"
        echo "Uso: $0 restore <arquivo-backup>"
        list_backups
        exit 1
    fi

    if [ ! -f "$backup_file" ]; then
        log_error "Arquivo de backup não encontrado: $backup_file"
        exit 1
    fi

    log_warning "ATENÇÃO: Esta operação irá substituir todos os dados atuais!"
    read -p "Deseja continuar? (s/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log_info "Operação cancelada"
        exit 0
    fi

    log_info "Iniciando restore do backup: $backup_file"

    # Parar container
    if docker ps -q -f name="$CONTAINER_NAME" | grep -q .; then
        log_info "Parando container..."
        docker stop "$CONTAINER_NAME"
    fi

    # Backup dos dados atuais
    if [ -d "$DATA_DIR" ]; then
        CURRENT_BACKUP="$DATA_DIR-backup-$(date +%Y%m%d_%H%M%S)"
        log_info "Fazendo backup dos dados atuais para: $CURRENT_BACKUP"
        cp -r "$DATA_DIR" "$CURRENT_BACKUP"
    fi

    # Limpar diretório atual
    rm -rf "$DATA_DIR"
    mkdir -p "$DATA_DIR"

    # Restaurar backup
    log_info "Restaurando dados..."
    tar -xzf "$backup_file" -C "$DATA_DIR" || {
        log_error "Falha ao restaurar backup"
        exit 1
    }

    # Ajustar permissões
    chown -R 1000:1000 "$DATA_DIR"

    # Reiniciar container
    log_info "Reiniciando container..."
    docker start "$CONTAINER_NAME" || {
        log_error "Falha ao iniciar container"
        exit 1
    }

    log_success "Restore concluído com sucesso!"
}

# Listar backups disponíveis
list_backups() {
    log_info "Backups disponíveis:"
    if [ -d "$BACKUP_DIR" ]; then
        find "$BACKUP_DIR" -name "tailscale-funnel-backup-*.tar.gz" -type f -exec ls -lh {} \; | sort
    else
        log_warning "Nenhum backup encontrado"
    fi
}

# Mostrar status
status() {
    log_info "Status do Tailscale Funnel Manager:"
    echo
    echo "Container Status:"
    docker ps -a --filter name="$CONTAINER_NAME" --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo
    echo "Dados:"
    if [ -d "$DATA_DIR" ]; then
        echo "  Diretório: $DATA_DIR"
        echo "  Tamanho: $(du -sh "$DATA_DIR" 2>/dev/null | cut -f1)"
        echo "  Última modificação: $(stat -c %y "$DATA_DIR" 2>/dev/null | cut -d. -f1)"
    else
        echo "  Diretório de dados não encontrado"
    fi
    echo
    echo "Backups:"
    if [ -d "$BACKUP_DIR" ]; then
        BACKUP_COUNT=$(find "$BACKUP_DIR" -name "tailscale-funnel-backup-*.tar.gz" -type f | wc -l)
        echo "  Diretório: $BACKUP_DIR"
        echo "  Quantidade: $BACKUP_COUNT backups"
        if [ "$BACKUP_COUNT" -gt 0 ]; then
            LATEST_BACKUP=$(find "$BACKUP_DIR" -name "tailscale-funnel-backup-*.tar.gz" -type f -printf "%T@ %p\n" | sort -n | tail -1 | cut -d' ' -f2-)
            echo "  Último backup: $(basename "$LATEST_BACKUP")"
        fi
    else
        echo "  Nenhum backup encontrado"
    fi
}

# Função de help
show_help() {
    echo "Tailscale Funnel Manager - Backup & Restore"
    echo
    echo "Uso: $0 [comando] [opções]"
    echo
    echo "Comandos:"
    echo "  backup              Criar backup dos dados"
    echo "  restore <arquivo>   Restaurar backup"
    echo "  list               Listar backups disponíveis"
    echo "  status             Mostrar status do sistema"
    echo "  help               Mostrar esta ajuda"
    echo
    echo "Exemplos:"
    echo "  $0 backup"
    echo "  $0 restore /opt/casaos/backups/tailscale-funnel/tailscale-funnel-backup-20240101_120000.tar.gz"
    echo "  $0 list"
    echo
}

# Verificar permissões
if [ "$EUID" -ne 0 ]; then
    log_error "Este script precisa ser executado como root ou com sudo"
    exit 1
fi

# Main
case "${1:-help}" in
    backup)
        backup
        ;;
    restore)
        restore "$2"
        ;;
    list)
        list_backups
        ;;
    status)
        status
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Comando inválido: $1"
        show_help
        exit 1
        ;;
esac