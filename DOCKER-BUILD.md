# 🐳 Docker Build Instructions

Para construir e publicar a imagem Docker:

## ⚡ Método Rápido

Execute o script automatizado:
```bash
./build-and-push.sh
```

## 🔧 Método Manual

1. **Login no Docker Hub:**
```bash
docker login
```

2. **Construir a imagem:**
```bash
docker build -t willianquintino/tailscale-funnel-manager:latest .
```

3. **Testar localmente (opcional):**
```bash
docker run -p 8080:8080 willianquintino/tailscale-funnel-manager:latest
```

4. **Publicar no Docker Hub:**
```bash
docker push willianquintino/tailscale-funnel-manager:latest
```

## 📦 Resultado

A imagem estará disponível em:
- **Docker Hub:** `willianquintino/tailscale-funnel-manager:latest`
- **CasaOS:** Pronta para instalação via app store

## 🏗️ Multi-Architecture (Opcional)

Para construir para múltiplas arquiteturas:
```bash
docker buildx create --use
docker buildx build --platform linux/amd64,linux/arm64 -t willianquintino/tailscale-funnel-manager:latest --push .
```

---

**💡 Nota:** Execute estes comandos em um ambiente que tenha Docker instalado.