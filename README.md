# Tailscale Funnel Manager para CasaOS

Uma interface web completa para gerenciar Tailscale Funnels em ambientes CasaOS, permitindo expor seus containers e serviços para a internet de forma segura através da rede Tailscale.

![Version](https://img.shields.io/badge/version-1.0-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![CasaOS](https://img.shields.io/badge/CasaOS-Compatible-orange)

## 🌟 Características

### ✨ Interface Web Intuitiva
- Dashboard moderno e responsivo
- Monitoramento em tempo real
- Suporte a tema escuro/claro
- Notificações visuais

### 🐳 Descoberta Automática de Containers
- Detecta automaticamente containers CasaOS
- Identifica portas expostas
- Reconhece tipos de aplicação
- Suporte a projetos docker-compose

### 🔒 Segurança Integrada
- Autenticação Tailscale nativa
- Criptografia end-to-end
- Filtragem de informações sensíveis
- Isolamento de rede

### 🚀 Gerenciamento Completo de Funnels
- Criação com um clique
- Remoção segura
- Status em tempo real
- URLs prontas para compartilhar

## 📋 Pré-requisitos

- **CasaOS** instalado e funcionando
- **Docker** 20.10 ou superior
- **Git** para instalação
- **Conta Tailscale** ativa
- **Acesso root** ao servidor

## 🚀 Instalação Rápida

### Método 1: Script Automático

```bash
# Baixar e executar o instalador
curl -fsSL https://raw.githubusercontent.com/WillianQuintino/tailscale-funnel-manager/main/install.sh | sudo bash
```

### Método 2: Instalação Manual

```bash
# 1. Clonar o repositório
git clone https://github.com/WillianQuintino/tailscale-funnel-manager.git
cd tailscale-funnel-manager

# 2. Executar instalador
sudo ./install.sh
```

### Método 3: Docker Compose

```bash
# 1. Baixar arquivos
git clone https://github.com/WillianQuintino/tailscale-funnel-manager.git
cd tailscale-funnel-manager

# 2. Iniciar com Docker Compose
docker-compose up -d
```

## 🔧 Configuração

### 1. Acesso Inicial

Após a instalação, acesse a interface web:

```
http://seu-servidor:8080
```

### 2. Autenticação Tailscale

1. **Obter Token de Autenticação:**
   - Acesse: https://login.tailscale.com/admin/settings/keys
   - Clique em "Generate auth key"
   - Copie o token gerado

2. **Configurar no Manager:**
   - Cole o token na interface web
   - Clique em "Autenticar"
   - Aguarde a confirmação

### 3. Configuração Avançada

#### Portas Customizadas

```bash
# Alterar porta da interface web
docker run -d \
  --name tailscale-funnel-manager \
  -p 9090:8080 \
  # ... outras opções
```

#### Volumes Personalizados

```bash
# Configurar diretórios customizados
docker run -d \
  -v /meu/diretorio/dados:/app/data \
  -v /meu/diretorio/tailscale:/var/lib/tailscale \
  # ... outras opções
```

## 📖 Como Usar

### 1. Dashboard Principal

O dashboard fornece:
- **Status Tailscale**: Conectividade e informações da rede
- **Containers Detectados**: Lista de containers CasaOS com portas
- **Funnels Ativos**: Túneis criados e suas URLs
- **Ferramentas**: Botões de ação rápida

### 2. Criar um Funnel

#### Método Automático (Recomendado)

1. **Visualizar Containers:**
   - Os containers são detectados automaticamente
   - Portas expostas são mostradas como badges

2. **Criar Funnel:**
   - Clique no botão "Porta XXXX" do container desejado
   - O formulário será preenchido automaticamente
   - Clique em "Criar"

#### Método Manual

1. **Preencher Formulário:**
   - **Porta Externa**: Escolha entre 443, 8443 ou 10000
   - **Porta Local**: Porta do seu serviço
   - **Nome do Serviço**: Nome descritivo

2. **Confirmar Criação:**
   - Clique em "Criar"
   - Aguarde confirmação

### 3. Gerenciar Funnels

- **Visualizar**: URLs são exibidas na seção "Funnels Ativos"
- **Copiar URL**: Clique no ícone de cópia
- **Remover**: Clique no botão "Remover"

### 4. Exemplos Práticos

#### Expor Jellyfin (Media Server)

```
Container: jellyfin
Porta Local: 8096
Porta Externa: 443
URL Resultante: https://meu-servidor.tailnet.ts.net
```

#### Expor Home Assistant

```
Container: homeassistant
Porta Local: 8123
Porta Externa: 8443
URL Resultante: https://meu-servidor.tailnet.ts.net:8443
```

#### Expor Nextcloud

```
Container: nextcloud
Porta Local: 80
Porta Externa: 10000
URL Resultante: https://meu-servidor.tailnet.ts.net:10000
```

## 🔍 Monitoramento e Logs

### Verificar Status

```bash
# Status do container
docker ps | grep tailscale-funnel-manager

# Logs em tempo real
docker logs -f tailscale-funnel-manager

# Status do Tailscale
docker exec tailscale-funnel-manager tailscale status
```

### Backup e Restore

```bash
# Criar backup
sudo /opt/casaos/tailscale-funnel/scripts/backup_restore.sh backup

# Listar backups
sudo /opt/casaos/tailscale-funnel/scripts/backup_restore.sh list

# Restaurar backup
sudo /opt/casaos/tailscale-funnel/scripts/backup_restore.sh restore /caminho/para/backup.tar.gz
```

## 🛠️ Solução de Problemas

### Problemas Comuns

#### 1. Tailscale não conecta

**Sintomas:**
- Status "Desconectado"
- Erro de autenticação

**Soluções:**
```bash
# Verificar logs
docker logs tailscale-funnel-manager

# Restart do container
docker restart tailscale-funnel-manager

# Verificar token
# Gere um novo token em: https://login.tailscale.com/admin/settings/keys
```

#### 2. Containers não aparecem

**Sintomas:**
- Lista de containers vazia
- "Nenhum container encontrado"

**Soluções:**
```bash
# Verificar socket do Docker
ls -la /var/run/docker.sock

# Verificar permissões
docker exec tailscale-funnel-manager ls -la /var/run/docker.sock

# Restart do monitor
docker exec tailscale-funnel-manager supervisorctl restart container-monitor
```

#### 3. Funnel não funciona

**Sintomas:**
- URL inacessível
- Erro de conexão

**Soluções:**
```bash
# Verificar status do funnel
docker exec tailscale-funnel-manager tailscale funnel status

# Verificar porta disponível
netstat -tlnp | grep :PORTA

# Reiniciar Tailscale
docker exec tailscale-funnel-manager supervisorctl restart tailscale
```

#### 4. Interface web inacessível

**Sintomas:**
- Página não carrega
- Erro 502/503

**Soluções:**
```bash
# Verificar porta
docker port tailscale-funnel-manager

# Verificar aplicação web
docker exec tailscale-funnel-manager supervisorctl status web-app

# Restart da aplicação
docker exec tailscale-funnel-manager supervisorctl restart web-app
```

### Logs Detalhados

```bash
# Logs do supervisor
docker exec tailscale-funnel-manager cat /var/log/supervisor/supervisord.log

# Logs do Tailscale
docker exec tailscale-funnel-manager cat /var/log/supervisor/tailscale.log

# Logs da aplicação web
docker exec tailscale-funnel-manager cat /var/log/supervisor/webapp.log

# Logs do monitor
docker exec tailscale-funnel-manager cat /var/log/supervisor/monitor.log
```

## 🔒 Segurança

### Melhores Práticas

1. **Token de Autenticação:**
   - Use tokens com escopo limitado
   - Regenere tokens periodicamente
   - Não compartilhe tokens

2. **Acesso à Interface:**
   - Configure firewall para porta 8080
   - Use HTTPS proxy se necessário
   - Monitore logs de acesso

3. **Containers Expostos:**
   - Revise regularmente funnels ativos
   - Remova funnels não utilizados
   - Configure autenticação nos serviços

### Auditoria

```bash
# Verificar funnels ativos
docker exec tailscale-funnel-manager tailscale funnel status

# Verificar dispositivos conectados
docker exec tailscale-funnel-manager tailscale status

# Histórico de configurações
cat /opt/casaos/tailscale-funnel/data/config.json
```

## 📁 Estrutura do Projeto

```
tailscale-funnel-manager/
├── Dockerfile                 # Container principal
├── docker-compose.yml        # Orquestração
├── requirements.txt          # Dependências Python
├── supervisord.conf          # Gerenciamento de processos
├── install.sh                # Script de instalação
├── web/                      # Interface web
│   ├── app.py               # Aplicação Flask
│   ├── templates/           # Templates HTML
│   └── static/              # CSS/JS
├── scripts/                  # Scripts auxiliares
│   ├── container_monitor.py # Monitor de containers
│   └── backup_restore.sh    # Backup/Restore
└── README.md                # Esta documentação
```

## 🤝 Contribuição

### Como Contribuir

1. **Fork** o projeto
2. **Clone** seu fork
3. **Crie** uma branch para sua feature
4. **Implemente** suas mudanças
5. **Teste** completamente
6. **Envie** um Pull Request

### Desenvolvimento Local

```bash
# 1. Clonar repositório
git clone https://github.com/WillianQuintino/tailscale-funnel-manager.git
cd tailscale-funnel-manager

# 2. Ambiente Python
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# 3. Executar localmente
cd web
python app.py
```

### Testes

```bash
# Construir imagem de teste
docker build -t tailscale-funnel-manager:test .

# Executar testes
docker run --rm tailscale-funnel-manager:test pytest
```

## 📄 Licença

Este projeto está licenciado sob a Licença MIT - veja o arquivo [LICENSE](LICENSE) para detalhes.

## 🆘 Suporte

### Canais de Suporte

- **Issues**: [GitHub Issues](https://github.com/WillianQuintino/tailscale-funnel-manager/issues)
- **Discussões**: [GitHub Discussions](https://github.com/WillianQuintino/tailscale-funnel-manager/discussions)
- **Wiki**: [Documentação Completa](https://github.com/WillianQuintino/tailscale-funnel-manager/wiki)

### FAQ

**P: Posso usar sem CasaOS?**
R: Sim! O manager funciona com qualquer ambiente Docker.

**P: Quais portas posso usar para Funnels?**
R: Apenas 443, 8443 e 10000 são suportadas pelo Tailscale Funnel.

**P: É seguro expor meus serviços?**
R: Sim, o Tailscale Funnel usa criptografia end-to-end e autenticação.

**P: Posso usar múltiplos Funnels?**
R: Sim, você pode criar funnels para diferentes portas simultaneamente.

## 🎯 Roadmap

### Versão 1.1
- [ ] Suporte a SSL/TLS customizado
- [ ] Templates de configuração
- [ ] Notificações por webhook

### Versão 1.2
- [ ] API REST completa
- [ ] Plugin para CasaOS oficial
- [ ] Monitoramento de tráfego

### Versão 1.3
- [ ] Balanceamento de carga
- [ ] Rate limiting
- [ ] Integração com outros VPNs

---

**Desenvolvido com ❤️ para a comunidade CasaOS**

Para mais informações sobre Tailscale Funnel, visite: [Tailscale Documentation](https://tailscale.com/kb/1223/funnel)