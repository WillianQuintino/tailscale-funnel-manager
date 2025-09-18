# Tutorial Completo: Tailscale Funnel Manager para CasaOS

Este tutorial guiará você passo a passo pela instalação e uso do Tailscale Funnel Manager em seu ambiente CasaOS.

## 📚 Índice

1. [Preparação](#1-preparação)
2. [Instalação](#2-instalação)
3. [Configuração Inicial](#3-configuração-inicial)
4. [Primeiro Funnel](#4-primeiro-funnel)
5. [Gerenciamento Avançado](#5-gerenciamento-avançado)
6. [Casos de Uso Práticos](#6-casos-de-uso-práticos)
7. [Manutenção](#7-manutenção)
8. [Troubleshooting](#8-troubleshooting)

## 1. Preparação

### 1.1 Verificar Pré-requisitos

Antes de começar, certifique-se de que tem:

```bash
# Verificar Docker
docker --version
# Deve retornar: Docker version 20.10 ou superior

# Verificar CasaOS
ls /opt/casaos
# Deve mostrar arquivos do CasaOS

# Verificar Git
git --version
# Deve retornar: git version x.x.x
```

### 1.2 Preparar Conta Tailscale

1. **Criar Conta:**
   - Acesse https://tailscale.com
   - Clique em "Get started for free"
   - Faça login com Google, Microsoft ou GitHub

2. **Configurar Tailnet:**
   - No painel admin, configure seu tailnet
   - Anote o nome do seu tailnet (ex: `usuario.tailscale.net`)

3. **Gerar Token de Autenticação:**
   - Acesse https://login.tailscale.com/admin/settings/keys
   - Clique em "Generate auth key"
   - Configure as opções:
     - ✅ **Reusable**: Permite reutilizar o token
     - ✅ **Ephemeral**: Remove dispositivo ao desconectar
     - ⏰ **Expiry**: 90 dias (recomendado)
   - Copie e guarde o token em local seguro

## 2. Instalação

### 2.1 Instalação Automática (Recomendada)

Execute o comando único de instalação:

```bash
# Baixar e executar instalador
curl -fsSL https://raw.githubusercontent.com/seu-usuario/tailscale-funnel-manager/main/install.sh | sudo bash
```

**O que o script faz:**
- ✅ Verifica dependências
- ✅ Detecta CasaOS
- ✅ Cria diretórios necessários
- ✅ Baixa código fonte
- ✅ Constrói imagem Docker
- ✅ Inicia container
- ✅ Configura docker-compose
- ✅ Cria manifest CasaOS

### 2.2 Instalação Manual

Se preferir controle total:

```bash
# 1. Criar diretório de trabalho
sudo mkdir -p /opt/casaos/tailscale-funnel
cd /opt/casaos/tailscale-funnel

# 2. Baixar código
git clone https://github.com/seu-usuario/tailscale-funnel-manager.git .

# 3. Construir imagem
docker build -t tailscale-funnel-manager .

# 4. Criar volumes
sudo mkdir -p data tailscale
sudo chown -R 1000:1000 data tailscale

# 5. Iniciar container
docker run -d \
  --name tailscale-funnel-manager \
  --restart unless-stopped \
  -p 8080:8080 \
  -v $(pwd)/data:/app/data \
  -v $(pwd)/tailscale:/var/lib/tailscale \
  -v /var/run/docker.sock:/var/run/docker.sock \
  --net=host \
  --privileged \
  tailscale-funnel-manager
```

### 2.3 Verificar Instalação

```bash
# Verificar container
docker ps | grep tailscale-funnel-manager

# Verificar logs
docker logs tailscale-funnel-manager

# Testar acesso web
curl -I http://localhost:8080
```

**Saída esperada:**
```
CONTAINER ID   IMAGE                        COMMAND       STATUS
abc123def456   tailscale-funnel-manager     "/usr/bin..."  Up 2 minutes

HTTP/1.1 200 OK
```

## 3. Configuração Inicial

### 3.1 Acessar Interface Web

1. **Abrir navegador:**
   ```
   http://seu-servidor-ip:8080
   ```

2. **Primeira tela:**
   - Você verá o dashboard principal
   - Status Tailscale mostrará "Desconectado"
   - Seção de autenticação estará visível

### 3.2 Autenticar Tailscale

1. **Inserir Token:**
   - Cole o token que você gerou no passo 1.2
   - Clique em "Autenticar"

2. **Aguardar Conectividade:**
   - O sistema irá se conectar ao Tailscale
   - Status mudará para "Conectado"
   - Informações da rede serão exibidas

3. **Verificar Conectividade:**
   ```bash
   # Via CLI
   docker exec tailscale-funnel-manager tailscale status
   ```

**Saída esperada:**
```
100.x.x.x   servidor-casa    tagged-devices   linux   active; relay "sao", tx 1234 rx 5678
```

### 3.3 Verificar Descoberta de Containers

Após autenticação, a seção "Containers CasaOS Detectados" deve mostrar:

- **Lista de containers** em execução
- **Portas expostas** como badges azuis
- **Botões de ação** para cada porta
- **Status** de cada container

Se não aparecer containers:
```bash
# Verificar monitor
docker exec tailscale-funnel-manager supervisorctl status container-monitor

# Restart monitor se necessário
docker exec tailscale-funnel-manager supervisorctl restart container-monitor
```

## 4. Primeiro Funnel

### 4.1 Cenário: Expor Jellyfin

Vamos expor um servidor de mídia Jellyfin como exemplo.

**Pré-requisitos:**
- Container Jellyfin rodando
- Porta 8096 exposta

### 4.2 Método Automático

1. **Localizar Container:**
   - Na tabela de containers, encontre "jellyfin"
   - Veja a porta "8096" listada

2. **Criar Funnel:**
   - Clique no botão "Porta 8096"
   - Formulário será preenchido automaticamente:
     - Porta Externa: 443
     - Porta Local: 8096
     - Nome do Serviço: jellyfin

3. **Confirmar:**
   - Clique em "Criar"
   - Aguarde confirmação

### 4.3 Método Manual

1. **Preencher Formulário:**
   - Porta Externa: `443`
   - Porta Local: `8096`
   - Nome do Serviço: `Jellyfin Media Server`

2. **Criar:**
   - Clique em "Criar"
   - Aguarde processamento

### 4.4 Verificar Funnel Criado

1. **Na Interface Web:**
   - Seção "Funnels Ativos" mostrará o novo tunnel
   - URL será exibida: `https://servidor-casa.tailnet.ts.net`

2. **Via CLI:**
   ```bash
   docker exec tailscale-funnel-manager tailscale funnel status
   ```

3. **Testar Acesso:**
   - Acesse a URL no navegador
   - Jellyfin deve carregar normalmente

## 5. Gerenciamento Avançado

### 5.1 Múltiplos Funnels

Você pode criar múltiplos funnels usando diferentes portas:

**Exemplo: Home Assistant + Jellyfin**

1. **Jellyfin (Porta 443):**
   ```
   Porta Externa: 443
   Porta Local: 8096
   URL: https://servidor.tailnet.ts.net
   ```

2. **Home Assistant (Porta 8443):**
   ```
   Porta Externa: 8443
   Porta Local: 8123
   URL: https://servidor.tailnet.ts.net:8443
   ```

### 5.2 Gerenciar URLs

1. **Copiar URLs:**
   - Clique no ícone de cópia ao lado da URL
   - URL será copiada para área de transferência

2. **Personalizar Domínio:**
   - No painel Tailscale Admin
   - Configure DNS personalizado se desejar

### 5.3 Remover Funnels

1. **Via Interface Web:**
   - Clique em "Remover" no funnel desejado
   - Confirme a ação

2. **Via CLI:**
   ```bash
   docker exec tailscale-funnel-manager tailscale funnel --bg=false 443
   ```

## 6. Casos de Uso Práticos

### 6.1 Servidor de Arquivos (Nextcloud)

**Cenário:** Expor Nextcloud para acesso remoto

```
Container: nextcloud
Porta Local: 80
Porta Externa: 443
URL Final: https://meu-servidor.tailnet.ts.net
```

**Configuração adicional no Nextcloud:**
```php
// config.php
'trusted_domains' => [
  'meu-servidor.tailnet.ts.net',
],
'overwriteprotocol' => 'https',
```

### 6.2 Dashboard de Monitoramento (Grafana)

**Cenário:** Expor Grafana para monitoramento remoto

```
Container: grafana
Porta Local: 3000
Porta Externa: 8443
URL Final: https://meu-servidor.tailnet.ts.net:8443
```

### 6.3 Servidor de Jogos (Minecraft Web Admin)

**Cenário:** Expor painel admin do servidor Minecraft

```
Container: minecraft-admin
Porta Local: 8080
Porta Externa: 10000
URL Final: https://meu-servidor.tailnet.ts.net:10000
```

### 6.4 Backup Remoto (Duplicati)

**Cenário:** Acessar interface do Duplicati remotamente

```
Container: duplicati
Porta Local: 8200
Porta Externa: 8443
URL Final: https://meu-servidor.tailnet.ts.net:8443
```

## 7. Manutenção

### 7.1 Backup Regular

```bash
# Criar backup automático
sudo /opt/casaos/tailscale-funnel/scripts/backup_restore.sh backup

# Verificar backups existentes
sudo /opt/casaos/tailscale-funnel/scripts/backup_restore.sh list
```

### 7.2 Atualizações

```bash
# Atualizar imagem
cd /opt/casaos/tailscale-funnel
git pull
docker-compose build --no-cache
docker-compose up -d

# Verificar versão
docker exec tailscale-funnel-manager cat /app/VERSION
```

### 7.3 Monitoramento

```bash
# Status geral
sudo /opt/casaos/tailscale-funnel/scripts/backup_restore.sh status

# Logs em tempo real
docker logs -f tailscale-funnel-manager

# Usar interface web
# Acesse http://servidor:8080 regularmente
```

### 7.4 Limpeza

```bash
# Remover logs antigos
docker exec tailscale-funnel-manager find /var/log -name "*.log" -mtime +30 -delete

# Limpar backups antigos (automático no script de backup)
sudo /opt/casaos/tailscale-funnel/scripts/backup_restore.sh backup
```

## 8. Troubleshooting

### 8.1 Problemas de Conexão

**Sintoma:** Interface web não carrega

```bash
# Verificar container
docker ps | grep tailscale-funnel-manager

# Verificar porta
netstat -tlnp | grep :8080

# Restart container
docker restart tailscale-funnel-manager
```

### 8.2 Tailscale Não Conecta

**Sintoma:** Status "Desconectado" persistente

```bash
# Verificar logs do Tailscale
docker exec tailscale-funnel-manager cat /var/log/supervisor/tailscale.log

# Gerar novo token
# Acesse https://login.tailscale.com/admin/settings/keys

# Re-autenticar via interface web
```

### 8.3 Containers Não Aparecem

**Sintoma:** Lista de containers vazia

```bash
# Verificar monitor de containers
docker exec tailscale-funnel-manager supervisorctl status container-monitor

# Verificar socket Docker
ls -la /var/run/docker.sock

# Restart monitor
docker exec tailscale-funnel-manager supervisorctl restart container-monitor
```

### 8.4 Funnel Não Funciona

**Sintoma:** URL inacessível externamente

```bash
# Verificar status do funnel
docker exec tailscale-funnel-manager tailscale funnel status

# Verificar se serviço local responde
curl http://localhost:PORTA_LOCAL

# Verificar conectividade Tailscale
docker exec tailscale-funnel-manager tailscale ping outro-dispositivo
```

### 8.5 Performance Issues

**Sintoma:** Interface lenta ou timeouts

```bash
# Verificar recursos
docker stats tailscale-funnel-manager

# Verificar logs de erro
docker logs tailscale-funnel-manager | grep ERROR

# Aumentar recursos se necessário
docker update --memory=512m tailscale-funnel-manager
```

## 🎯 Próximos Passos

Após completar este tutorial, você pode:

1. **Explorar Features Avançadas:**
   - Configurar backup automático
   - Monitorar tráfego
   - Configurar alertas

2. **Integrar com Outros Serviços:**
   - Configurar proxy reverso
   - Implementar autenticação adicional
   - Configurar certificados customizados

3. **Contribuir para o Projeto:**
   - Reportar bugs
   - Sugerir melhorias
   - Contribuir com código

## 📞 Suporte

Se precisar de ajuda:

- **Documentação**: README.md
- **Issues**: GitHub Issues
- **Comunidade**: GitHub Discussions

---

**Parabéns! 🎉**

Você completou a configuração do Tailscale Funnel Manager. Seus serviços CasaOS agora podem ser acessados de qualquer lugar de forma segura através da sua rede Tailscale.

**Lembre-se:**
- Mantenha seus tokens seguros
- Faça backups regulares
- Monitore o acesso aos seus serviços
- Mantenha o sistema atualizado