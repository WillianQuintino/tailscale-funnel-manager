// Tailscale Funnel Manager JavaScript

let statusData = {};
let refreshInterval;

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    refreshStatus();
    startAutoRefresh();
    setupEventListeners();
});

function setupEventListeners() {
    // Form de criação de funnel
    document.getElementById('create-funnel-form').addEventListener('submit', function(e) {
        e.preventDefault();
        createFunnel();
    });

    // Auto-refresh a cada 30 segundos
    refreshInterval = setInterval(refreshStatus, 30000);
}

function startAutoRefresh() {
    setInterval(refreshStatus, 10000); // Refresh a cada 10 segundos
}

async function refreshStatus() {
    try {
        showLoading('status-indicator', 'Atualizando...');

        const response = await fetch('/api/status');
        const data = await response.json();

        statusData = data;
        updateUI(data);

        document.getElementById('status-indicator').className = 'badge bg-success';
        document.getElementById('status-indicator').textContent = 'Online';

    } catch (error) {
        console.error('Erro ao atualizar status:', error);
        document.getElementById('status-indicator').className = 'badge bg-danger';
        document.getElementById('status-indicator').textContent = 'Erro';
        showAlert('Erro ao conectar com o servidor', 'danger');
    }
}

function updateUI(data) {
    updateAuthSection(data.authenticated);
    updateTailscaleStatus(data.tailscale);
    updateContainersTable(data.containers);
    updateActiveFunnels(data.tunnels);
}

function updateAuthSection(authenticated) {
    const authSection = document.getElementById('auth-section');
    if (!authenticated) {
        authSection.style.display = 'block';
    } else {
        authSection.style.display = 'none';
    }
}

function updateTailscaleStatus(tailscale) {
    const stateElement = document.getElementById('tailscale-state');
    const ipElement = document.getElementById('tailscale-ip');
    const hostnameElement = document.getElementById('tailscale-hostname');

    if (tailscale.BackendState === 'Running') {
        stateElement.className = 'badge bg-success';
        stateElement.textContent = 'Conectado';

        if (tailscale.Self) {
            ipElement.textContent = tailscale.Self.TailscaleIPs ? tailscale.Self.TailscaleIPs[0] : '-';
            hostnameElement.textContent = tailscale.Self.HostName || '-';
        }
    } else {
        stateElement.className = 'badge bg-danger';
        stateElement.textContent = 'Desconectado';
        ipElement.textContent = '-';
        hostnameElement.textContent = '-';
    }
}

function updateContainersTable(containers) {
    const tbody = document.getElementById('containers-table');

    if (!containers || containers.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" class="text-center">Nenhum container encontrado</td></tr>';
        return;
    }

    tbody.innerHTML = containers.map(container => {
        const statusClass = getContainerStatusClass(container.status);
        const ports = container.ports.map(p =>
            `<span class="badge bg-secondary port-badge">${p.host_port}</span>`
        ).join(' ');

        const actionButtons = container.ports.map(p =>
            `<button class="btn btn-sm btn-outline-primary me-1"
                     onclick="createFunnelForContainer('${container.id}', '${p.host_port}', '${container.name}')">
                <i class="fas fa-share"></i> Porta ${p.host_port}
             </button>`
        ).join('');

        return `
            <tr>
                <td>
                    <strong>${container.name}</strong>
                    <br><small class="text-muted">${container.id}</small>
                </td>
                <td>
                    <span class="badge ${statusClass}">${container.status}</span>
                </td>
                <td>
                    <small>${container.image}</small>
                </td>
                <td>${ports}</td>
                <td>
                    <div class="btn-group-vertical" role="group">
                        ${actionButtons}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function getContainerStatusClass(status) {
    switch (status.toLowerCase()) {
        case 'running': return 'bg-success';
        case 'exited': return 'bg-danger';
        case 'paused': return 'bg-warning';
        default: return 'bg-secondary';
    }
}

function updateActiveFunnels(tunnels) {
    const container = document.getElementById('active-funnels');

    if (!tunnels || Object.keys(tunnels).length === 0) {
        container.innerHTML = '<p class="text-muted">Nenhum funnel ativo</p>';
        return;
    }

    container.innerHTML = Object.entries(tunnels).map(([port, tunnel]) => `
        <div class="funnel-item">
            <div class="row align-items-center">
                <div class="col-md-8">
                    <h6 class="mb-1">${tunnel.service_name || 'Serviço'} - Porta ${port}</h6>
                    <div class="funnel-url">
                        https://your-tailscale-name.your-tailnet.ts.net:${port}
                        <button class="copy-button ms-2" onclick="copyToClipboard('https://your-tailscale-name.your-tailnet.ts.net:${port}')">
                            <i class="fas fa-copy"></i>
                        </button>
                    </div>
                    <small class="text-muted">
                        Container: ${tunnel.container_id || 'N/A'} |
                        Criado: ${new Date(tunnel.created_at * 1000).toLocaleString()}
                    </small>
                </div>
                <div class="col-md-4 text-end">
                    <button class="btn btn-sm btn-danger" onclick="removeFunnel('${port}')">
                        <i class="fas fa-times"></i> Remover
                    </button>
                </div>
            </div>
        </div>
    `).join('');
}

async function authenticateTailscale() {
    const token = document.getElementById('tailscale-token').value.trim();

    if (!token) {
        showAlert('Por favor, insira o token de autenticação', 'warning');
        return;
    }

    showLoading('auth-section', 'Autenticando...');

    try {
        const response = await fetch('/api/authenticate', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token })
        });

        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            document.getElementById('tailscale-token').value = '';
            setTimeout(refreshStatus, 2000);
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        showAlert('Erro ao autenticar', 'danger');
    }
}

async function createFunnel() {
    const port = document.getElementById('funnel-port').value;
    const localPort = document.getElementById('local-port').value;
    const serviceName = document.getElementById('service-name').value;

    if (!port || !localPort) {
        showAlert('Porta externa e local são obrigatórias', 'warning');
        return;
    }

    // Para simplificar, vamos usar a porta externa como porta de destino
    // Em uma implementação mais avançada, você poderia configurar redirecionamento

    showLoading('create-funnel-form', 'Criando funnel...');

    try {
        const response = await fetch('/api/create-funnel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                port: port,
                service_name: serviceName,
                container_id: ''
            })
        });

        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            document.getElementById('create-funnel-form').reset();
            setTimeout(refreshStatus, 2000);
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        showAlert('Erro ao criar funnel', 'danger');
    }
}

function createFunnelForContainer(containerId, hostPort, containerName) {
    // Preencher o formulário com os dados do container
    document.getElementById('funnel-port').value = '443'; // Porta padrão HTTPS
    document.getElementById('local-port').value = hostPort;
    document.getElementById('service-name').value = containerName;

    // Scroll para o formulário
    document.getElementById('create-funnel-form').scrollIntoView({ behavior: 'smooth' });

    showAlert(`Formulário preenchido para ${containerName}. Revise e clique em "Criar".`, 'info');
}

async function removeFunnel(port) {
    if (!confirm(`Tem certeza que deseja remover o funnel da porta ${port}?`)) {
        return;
    }

    try {
        const response = await fetch('/api/remove-funnel', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ port })
        });

        const result = await response.json();

        if (result.success) {
            showAlert(result.message, 'success');
            setTimeout(refreshStatus, 2000);
        } else {
            showAlert(result.message, 'danger');
        }
    } catch (error) {
        showAlert('Erro ao remover funnel', 'danger');
    }
}

function showAlert(message, type) {
    // Criar toast notification
    const toast = document.createElement('div');
    toast.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
    toast.style.cssText = 'top: 20px; right: 20px; z-index: 1055; min-width: 300px;';
    toast.innerHTML = `
        ${message}
        <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
    `;

    document.body.appendChild(toast);

    // Auto-remove após 5 segundos
    setTimeout(() => {
        if (toast.parentNode) {
            toast.parentNode.removeChild(toast);
        }
    }, 5000);
}

function showLoading(elementId, text) {
    const element = document.getElementById(elementId);
    element.style.opacity = '0.6';
    element.style.pointerEvents = 'none';
}

function hideLoading(elementId) {
    const element = document.getElementById(elementId);
    element.style.opacity = '1';
    element.style.pointerEvents = 'auto';
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        showAlert('URL copiada para a área de transferência!', 'success');
    }).catch(() => {
        showAlert('Erro ao copiar URL', 'danger');
    });
}

// Cleanup ao sair da página
window.addEventListener('beforeunload', function() {
    if (refreshInterval) {
        clearInterval(refreshInterval);
    }
});