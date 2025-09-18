#!/bin/bash

# Script para deploy do App Store CasaOS personalizado
# Este script automatiza o processo de publicação do app store

set -e

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configurações
REPO_NAME="tailscale-funnel-manager"
GITHUB_USER=""
BRANCH_NAME="main"
APPSTORE_DIR="casaos-appstore"

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

# Verificar se está no diretório correto
check_directory() {
    if [ ! -d "$APPSTORE_DIR" ]; then
        log_error "Diretório $APPSTORE_DIR não encontrado!"
        log_info "Execute este script no diretório raiz do projeto"
        exit 1
    fi
    log_success "Diretório do app store encontrado"
}

# Validar estrutura do app store
validate_structure() {
    log_info "Validando estrutura do app store..."

    local required_files=(
        "$APPSTORE_DIR/store.json"
        "$APPSTORE_DIR/category-list.json"
        "$APPSTORE_DIR/featured-apps.json"
        "$APPSTORE_DIR/recommend-list.json"
        "$APPSTORE_DIR/Apps/Network/tailscale-funnel-manager/docker-compose.yml"
    )

    for file in "${required_files[@]}"; do
        if [ ! -f "$file" ]; then
            log_error "Arquivo obrigatório não encontrado: $file"
            exit 1
        fi
    done

    log_success "Estrutura do app store validada"
}

# Validar manifesto da aplicação
validate_manifest() {
    log_info "Validando manifesto da aplicação..."

    local manifest="$APPSTORE_DIR/Apps/Network/tailscale-funnel-manager/docker-compose.yml"

    # Verificar se contém campos obrigatórios
    if ! grep -q "x-casaos:" "$manifest"; then
        log_error "Manifesto não contém seção x-casaos obrigatória"
        exit 1
    fi

    if ! grep -q "name:" "$manifest"; then
        log_error "Manifesto não contém nome do serviço"
        exit 1
    fi

    log_success "Manifesto validado"
}

# Atualizar URLs no store.json
update_urls() {
    if [ -z "$GITHUB_USER" ]; then
        log_info "Digite seu usuário do GitHub:"
        read -r GITHUB_USER
    fi

    if [ -z "$GITHUB_USER" ]; then
        log_error "Usuário do GitHub é obrigatório"
        exit 1
    fi

    log_info "Atualizando URLs para usuário: $GITHUB_USER"

    # Atualizar store.json
    sed -i.bak "s|seu-usuario|$GITHUB_USER|g" "$APPSTORE_DIR/store.json"
    sed -i.bak "s|seu-usuario|$GITHUB_USER|g" "$APPSTORE_DIR/featured-apps.json"
    sed -i.bak "s|seu-usuario|$GITHUB_USER|g" "$APPSTORE_DIR/README.md"

    # Remover backups
    rm -f "$APPSTORE_DIR"/*.bak

    log_success "URLs atualizadas"
}

# Criar arquivo .gitignore específico para o app store
create_gitignore() {
    cat > "$APPSTORE_DIR/.gitignore" << EOF
# Arquivos temporários
*.bak
*.tmp

# Logs
*.log

# Arquivos de sistema
.DS_Store
Thumbs.db
EOF

    log_success "Arquivo .gitignore criado"
}

# Verificar se Docker image existe
check_docker_image() {
    log_info "Verificando disponibilidade da imagem Docker..."

    local image="ghcr.io/tailscale-funnel-manager/tailscale-funnel-manager:latest"

    log_warning "IMPORTANTE: Certifique-se de que a imagem Docker está publicada:"
    log_info "   $image"
    log_info ""
    log_info "Para publicar a imagem:"
    log_info "   1. Faça build da imagem: docker build -t $image ."
    log_info "   2. Publique no registry: docker push $image"
    log_info ""
    read -p "A imagem Docker está publicada e acessível? (s/N): " -n 1 -r
    echo

    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log_warning "Publique a imagem Docker antes de continuar"
        exit 0
    fi
}

# Criar release ZIP
create_release_zip() {
    log_info "Criando arquivo ZIP do app store..."

    local zip_file="tailscale-community-appstore.zip"

    cd "$APPSTORE_DIR"
    zip -r "../$zip_file" . -x "*.bak" "*.tmp" ".git/*"
    cd ..

    if [ -f "$zip_file" ]; then
        log_success "Arquivo ZIP criado: $zip_file"
    else
        log_error "Falha ao criar arquivo ZIP"
        exit 1
    fi
}

# Instruções finais
show_instructions() {
    log_success "App Store configurado com sucesso!"
    echo
    echo "=========================================="
    echo "         PRÓXIMOS PASSOS"
    echo "=========================================="
    echo
    echo "1. 📤 PUBLICAR NO GITHUB:"
    echo "   git add $APPSTORE_DIR/"
    echo "   git commit -m \"Add CasaOS app store\""
    echo "   git push origin $BRANCH_NAME"
    echo
    echo "2. 🐳 VERIFICAR IMAGEM DOCKER:"
    echo "   Certifique-se de que a imagem está publicada:"
    echo "   ghcr.io/tailscale-funnel-manager/tailscale-funnel-manager:latest"
    echo
    echo "3. 🔗 URL DO APP STORE:"
    echo "   https://raw.githubusercontent.com/$GITHUB_USER/$REPO_NAME/$BRANCH_NAME/$APPSTORE_DIR"
    echo
    echo "4. ➕ ADICIONAR AO CASAOS:"
    echo "   1. Abra CasaOS Dashboard"
    echo "   2. Vá para App Store"
    echo "   3. Clique em 'Add Source'"
    echo "   4. Cole a URL acima"
    echo
    echo "5. 📱 TESTAR INSTALAÇÃO:"
    echo "   1. Procure por 'Tailscale Funnel Manager'"
    echo "   2. Clique em instalar"
    echo "   3. Configure com seu token Tailscale"
    echo
    echo "6. 🌐 COMPARTILHAR:"
    echo "   Compartilhe a URL do app store com a comunidade!"
    echo
    echo "=========================================="
    echo "   App Store URL para CasaOS:"
    echo "   https://raw.githubusercontent.com/$GITHUB_USER/$REPO_NAME/$BRANCH_NAME/$APPSTORE_DIR"
    echo "=========================================="
}

# Função principal
main() {
    echo "======================================================="
    echo "    Deploy do Tailscale Community AppStore"
    echo "======================================================="
    echo

    check_directory
    validate_structure
    validate_manifest
    update_urls
    create_gitignore
    check_docker_image
    create_release_zip
    show_instructions
}

# Executar se chamado diretamente
if [ "${BASH_SOURCE[0]}" == "${0}" ]; then
    main "$@"
fi