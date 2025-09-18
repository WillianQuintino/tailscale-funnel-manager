# Guia Completo: App Store CasaOS Personalizado

Este guia explica como publicar e usar o Tailscale Funnel Manager através de um app store personalizado no CasaOS.

## 📋 Visão Geral

O app store personalizado permite instalar o Tailscale Funnel Manager diretamente pela interface do CasaOS, oferecendo:

- ✅ **Instalação com um clique**
- ✅ **Configuração automática de volumes**
- ✅ **Interface integrada ao CasaOS**
- ✅ **Atualizações gerenciadas**
- ✅ **Suporte multi-idioma (EN/PT)**

## 🚀 Parte 1: Publicar o App Store

### 1.1 Preparar Repositório GitHub

```bash
# 1. Criar repositório no GitHub
# Nome sugerido: tailscale-funnel-manager

# 2. Clonar e configurar
git clone https://github.com/SEU-USUARIO/tailscale-funnel-manager.git
cd tailscale-funnel-manager

# 3. Copiar arquivos do projeto
# (copie todos os arquivos criados anteriormente)
```

### 1.2 Publicar Imagem Docker

```bash
# 1. Fazer login no GitHub Container Registry
echo $GITHUB_TOKEN | docker login ghcr.io -u SEU-USUARIO --password-stdin

# 2. Construir imagem
docker build -t ghcr.io/SEU-USUARIO/tailscale-funnel-manager:latest .

# 3. Publicar imagem
docker push ghcr.io/SEU-USUARIO/tailscale-funnel-manager:latest

# 4. Tornar imagem pública (no GitHub)
# Vá para: github.com/SEU-USUARIO/tailscale-funnel-manager/pkgs/container/tailscale-funnel-manager
# Configure como "Public"
```

### 1.3 Configurar App Store

```bash
# 1. Executar script de configuração
./deploy-appstore.sh

# 2. Seguir as instruções para inserir seu usuário GitHub

# 3. Verificar estrutura criada
tree casaos-appstore/
```

### 1.4 Publicar no GitHub

```bash
# 1. Adicionar arquivos
git add .
git commit -m "Add Tailscale Funnel Manager and CasaOS App Store"
git push origin main

# 2. Verificar se está acessível
curl -s https://raw.githubusercontent.com/SEU-USUARIO/tailscale-funnel-manager/main/casaos-appstore/store.json
```

## 📱 Parte 2: Instalar via CasaOS

### 2.1 Adicionar App Store ao CasaOS

**Método 1: Interface Web (Recomendado)**

1. **Acessar CasaOS Dashboard:**
   ```
   http://seu-casaos-ip
   ```

2. **Ir para App Store:**
   - Clique no ícone da App Store no menu

3. **Adicionar Fonte:**
   - Clique no botão "+" ou "Add Source" (canto superior direito)
   - Cole a URL do seu app store:
     ```
     https://raw.githubusercontent.com/SEU-USUARIO/tailscale-funnel-manager/main/casaos-appstore
     ```
   - Clique em "Add" ou "Adicionar"

**Método 2: CLI**

```bash
# Conectar via SSH ao servidor CasaOS
ssh usuario@seu-casaos-ip

# Adicionar app store
casaos-cli app-management register app-store https://raw.githubusercontent.com/SEU-USUARIO/tailscale-funnel-manager/main/casaos-appstore
```

### 2.2 Instalar Tailscale Funnel Manager

1. **Localizar App:**
   - Na App Store, procure por "Tailscale Funnel Manager"
   - Ou navegue para categoria "Network"

2. **Instalar:**
   - Clique no app
   - Revise as configurações (porta padrão: 8080)
   - Clique em "Install"

3. **Aguardar Instalação:**
   - O CasaOS baixará a imagem Docker
   - Criará volumes necessários
   - Iniciará o container

### 2.3 Configuração Inicial

1. **Acessar Interface:**
   ```
   http://seu-casaos-ip:8080
   ```

2. **Autenticar Tailscale:**
   - Obtenha token em: https://login.tailscale.com/admin/settings/keys
   - Cole na interface web
   - Clique em "Autenticar"

3. **Verificar Funcionamento:**
   - Containers devem aparecer automaticamente
   - Status Tailscale deve mostrar "Conectado"

## 🔧 Parte 3: Gerenciamento Avançado

### 3.1 Personalizar App Store

**Adicionar Screenshots:**

```bash
# 1. Criar diretório de screenshots
mkdir screenshots

# 2. Adicionar imagens (PNG, 1920x1080 recomendado)
# - dashboard.png
# - containers.png
# - funnels.png

# 3. Atualizar URLs no docker-compose.yml
# screenshot_link:
#   - https://raw.githubusercontent.com/SEU-USUARIO/tailscale-funnel-manager/main/screenshots/dashboard.png
```

**Configurar Categorias Customizadas:**

```json
// casaos-appstore/category-list.json
[
  {
    "id": "networking",
    "name": {
      "en": "Networking & VPN",
      "pt": "Rede & VPN"
    },
    "description": {
      "en": "Network management and VPN tools",
      "pt": "Ferramentas de gerenciamento de rede e VPN"
    },
    "icon": "🌐"
  }
]
```

### 3.2 Adicionar Novos Apps

```bash
# 1. Criar estrutura para novo app
mkdir -p casaos-appstore/Apps/Network/novo-app

# 2. Criar docker-compose.yml
cat > casaos-appstore/Apps/Network/novo-app/docker-compose.yml << 'EOF'
name: novo-app
services:
  novo-app:
    image: namespace/image:tag
    # ... configuração do container

x-casaos:
  # ... metadados CasaOS
EOF

# 3. Atualizar metadados do store
# - featured-apps.json
# - recommend-list.json
# - store.json (contador total_apps)
```

### 3.3 Versionamento e Updates

```bash
# 1. Atualizar versão da imagem
docker build -t ghcr.io/SEU-USUARIO/tailscale-funnel-manager:v1.1 .
docker push ghcr.io/SEU-USUARIO/tailscale-funnel-manager:v1.1

# 2. Atualizar manifest
sed -i 's/:latest/:v1.1/g' casaos-appstore/Apps/Network/tailscale-funnel-manager/docker-compose.yml

# 3. Atualizar store.json
# Incrementar version e adicionar ao changelog

# 4. Publicar update
git add . && git commit -m "Update to v1.1" && git push
```

## 🧪 Parte 4: Testes e Validação

### 4.1 Teste Local

```bash
# 1. Servir app store localmente
cd casaos-appstore
python3 -m http.server 8000

# 2. Adicionar ao CasaOS
# URL: http://seu-ip:8000

# 3. Testar instalação
```

### 4.2 Validação de Manifesto

```bash
# 1. Verificar sintaxe YAML
yamllint casaos-appstore/Apps/Network/tailscale-funnel-manager/docker-compose.yml

# 2. Validar JSON
cat casaos-appstore/store.json | jq .

# 3. Testar URLs
curl -I https://raw.githubusercontent.com/SEU-USUARIO/tailscale-funnel-manager/main/casaos-appstore/store.json
```

### 4.3 Debug de Problemas

**App não aparece na store:**
```bash
# Verificar logs do CasaOS
docker logs casaos

# Verificar conectividade
curl https://raw.githubusercontent.com/SEU-USUARIO/tailscale-funnel-manager/main/casaos-appstore/store.json
```

**Falha na instalação:**
```bash
# Verificar se imagem existe
docker pull ghcr.io/SEU-USUARIO/tailscale-funnel-manager:latest

# Verificar logs de instalação
docker logs nome-do-container
```

## 📊 Parte 5: Monitoramento e Analytics

### 5.1 GitHub Analytics

- **Releases:** Monitore downloads das releases
- **Traffic:** Veja acessos ao repositório
- **Container Registry:** Monitore pulls da imagem

### 5.2 Feedback da Comunidade

```bash
# 1. Habilitar Issues no GitHub
# 2. Criar templates de issue
# 3. Configurar discussions
# 4. Monitorar usage via container stats
```

## 🌐 Parte 6: Distribuição e Promoção

### 6.1 Submeter para Awesome CasaOS

```bash
# 1. Fork https://github.com/awesome-casaos/awesome-casaos
# 2. Adicionar seu app store à lista
# 3. Submeter PR
```

### 6.2 Compartilhar com Comunidade

- **Reddit:** r/CasaOS, r/selfhosted
- **Discord:** Servidores CasaOS
- **Fóruns:** Comunidades de homelab

## 🔧 Comandos de Referência Rápida

```bash
# Adicionar app store via CLI
casaos-cli app-management register app-store https://raw.githubusercontent.com/SEU-USUARIO/tailscale-funnel-manager/main/casaos-appstore

# Listar app stores
casaos-cli app-management list app-store

# Remover app store
casaos-cli app-management unregister app-store URL

# Atualizar app stores
casaos-cli app-management update app-store

# Ver logs CasaOS
docker logs casaos

# Status de apps instalados
casaos-cli app-management list
```

## ✅ Checklist Final

- [ ] Repositório GitHub criado e público
- [ ] Imagem Docker publicada no GHCR
- [ ] App store configurado e testado
- [ ] URLs atualizadas corretamente
- [ ] Screenshots adicionados
- [ ] Documentação completa
- [ ] Teste de instalação via CasaOS
- [ ] Verificação de funcionamento completo
- [ ] Monitoramento configurado

---

**🎉 Parabéns!**

Seu Tailscale Funnel Manager agora está disponível como um app store personalizado para CasaOS, oferecendo instalação com um clique para toda a comunidade!