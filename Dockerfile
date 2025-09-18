FROM ubuntu:22.04

# Instalar dependências
RUN apt-get update && apt-get install -y \
    curl \
    wget \
    ca-certificates \
    gnupg \
    lsb-release \
    python3 \
    python3-pip \
    python3-venv \
    nodejs \
    npm \
    supervisor \
    docker.io \
    && rm -rf /var/lib/apt/lists/*

# Instalar Tailscale
RUN curl -fsSL https://tailscale.com/install.sh | sh

# Criar usuário não-root
RUN useradd -m -s /bin/bash tailscale-manager && \
    usermod -aG docker tailscale-manager

# Criar diretórios de trabalho
RUN mkdir -p /app /app/web /app/data /var/log/supervisor

# Instalar dependências Python
COPY requirements.txt /app/
RUN python3 -m pip install --no-cache-dir -r /app/requirements.txt

# Copiar aplicação
COPY web/ /app/web/
COPY scripts/ /app/scripts/
COPY supervisord.conf /etc/supervisor/conf.d/supervisord.conf

# Configurar permissões
RUN chown -R tailscale-manager:tailscale-manager /app
RUN chmod +x /app/scripts/*.sh

# Criar volume para dados persistentes
VOLUME ["/app/data", "/var/lib/tailscale"]

# Expor porta da interface web
EXPOSE 8080

# Comando de inicialização
CMD ["/usr/bin/supervisord", "-c", "/etc/supervisor/conf.d/supervisord.conf"]