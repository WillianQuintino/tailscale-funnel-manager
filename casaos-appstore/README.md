# Tailscale Community AppStore para CasaOS

Este é um app store personalizado para CasaOS que fornece aplicações relacionadas ao Tailscale e ferramentas de rede segura.

## 🚀 Como Adicionar este App Store ao CasaOS

### Método 1: Interface Web (Recomendado)

1. **Abra o CasaOS Dashboard**
2. **Acesse a App Store**
3. **Clique em "Adicionar Fonte" (Add Source)**
4. **Cole a URL do App Store:**
   ```
   https://raw.githubusercontent.com/WillianQuintino/tailscale-funnel-manager/main/casaos-appstore
   ```
5. **Clique em "Adicionar"**

### Método 2: CLI

```bash
# Usando o CLI do CasaOS
casaos-cli app-management register app-store https://raw.githubusercontent.com/WillianQuintino/tailscale-funnel-manager/main/casaos-appstore
```

## 📱 Aplicações Disponíveis

### Tailscale Funnel Manager
- **Categoria:** Network
- **Descrição:** Interface web para gerenciar Tailscale Funnels
- **Funcionalidades:**
  - Descoberta automática de containers CasaOS
  - Criação de funnels com um clique
  - Monitoramento em tempo real
  - Interface web moderna e responsiva

## 🔧 Requisitos

- **CasaOS:** Versão 0.4.4 ou superior
- **Docker:** Versão 20.10 ou superior
- **Arquiteturas:** AMD64, ARM64

## 📋 Estrutura do App Store

```
casaos-appstore/
├── Apps/
│   └── Network/
│       └── tailscale-funnel-manager/
│           └── docker-compose.yml
├── category-list.json
├── featured-apps.json
├── recommend-list.json
├── store.json
└── README.md
```

## 🛠️ Como Contribuir

### Adicionar Nova Aplicação

1. **Fork este repositório**
2. **Crie o manifesto da aplicação:**
   ```bash
   mkdir -p Apps/[CATEGORIA]/[NOME-APP]
   # Crie docker-compose.yml seguindo o formato CasaOS
   ```
3. **Atualize os metadados:**
   - Adicione à `category-list.json` se nova categoria
   - Adicione à `featured-apps.json` se destacada
   - Adicione à `recommend-list.json` se recomendada
   - Atualize `store.json` com contadores

4. **Teste no seu CasaOS**
5. **Submeta Pull Request**

### Formato do Manifesto

```yaml
name: nome-da-aplicacao
services:
  service-name:
    image: namespace/image:tag
    container_name: nome-container
    restart: unless-stopped
    ports:
      - target: 8080
        published: "8080"
        protocol: tcp
    volumes:
      - type: bind
        source: /DATA/AppData/$AppID/data
        target: /app/data
    environment:
      - TZ=$TZ
    labels:
      icon: https://example.com/icon.png
      desc_en: English description
      desc_pt: Descrição em português

x-casaos:
  architectures: [amd64, arm64]
  main: service-name
  author: Seu Nome
  category: Categoria
  description:
    en: English description
    pt: Descrição em português
  developer: Developer Name
  icon: https://example.com/icon.png
  tagline:
    en: English tagline
    pt: Tagline em português
  title:
    en: English Title
    pt: Título em Português
  tips:
    before_install:
      en: Installation instructions
      pt: Instruções de instalação
  thumbnail: https://example.com/thumbnail.png
  index: /
  port_map: "8080"
```

### Diretrizes de Contribuição

1. **Teste Completo:** Teste a aplicação no seu CasaOS antes de submeter
2. **Documentação:** Inclua descrições claras em inglês e português
3. **Ícones:** Use ícones de alta qualidade (PNG/SVG, 256x256px mínimo)
4. **Screenshots:** Inclua capturas de tela da aplicação
5. **Segurança:** Não inclua credenciais ou dados sensíveis

## 📊 Estatísticas

- **Total de Apps:** 1
- **Categorias:** 1 (Network)
- **Idiomas:** Inglês, Português
- **Arquiteturas:** AMD64, ARM64

## 🆘 Suporte

### Problemas com o App Store

- **Issues:** [GitHub Issues](https://github.com/seu-usuario/tailscale-funnel-manager/issues)
- **Discussões:** [GitHub Discussions](https://github.com/seu-usuario/tailscale-funnel-manager/discussions)

### Problemas com CasaOS

- **CasaOS GitHub:** [IceWhaleTech/CasaOS](https://github.com/IceWhaleTech/CasaOS)
- **Documentação:** [CasaOS Docs](https://casaos.zimaspace.com)

## 📄 Licença

Este app store é distribuído sob a licença MIT. Veja [LICENSE](LICENSE) para mais detalhes.

## 🔄 Atualizações

O app store é atualizado automaticamente quando há mudanças no repositório. O CasaOS verifica atualizações periodicamente.

## 🌐 Links Úteis

- **CasaOS Official:** https://casaos.zimaspace.com
- **Tailscale:** https://tailscale.com
- **Docker Hub:** https://hub.docker.com
- **Awesome CasaOS:** https://awesome.casaos.io

---

**Mantido pela Comunidade CasaOS** 🏠