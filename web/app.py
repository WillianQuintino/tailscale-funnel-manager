#!/usr/bin/env python3
import os
import json
import subprocess
import threading
import time
from flask import Flask, render_template, request, jsonify, redirect, url_for
from flask_cors import CORS
import docker
import requests

app = Flask(__name__)
CORS(app)

# Configurações
DATA_DIR = '/app/data'
CONFIG_FILE = os.path.join(DATA_DIR, 'config.json')
TAILSCALE_STATUS_CACHE = {}
CONTAINERS_CACHE = {}

def ensure_data_dir():
    os.makedirs(DATA_DIR, exist_ok=True)

def load_config():
    ensure_data_dir()
    if os.path.exists(CONFIG_FILE):
        with open(CONFIG_FILE, 'r') as f:
            return json.load(f)
    return {"tunnels": {}, "tailscale_token": ""}

def save_config(config):
    ensure_data_dir()
    with open(CONFIG_FILE, 'w') as f:
        json.dump(config, f, indent=2)

def run_command(cmd, check=True):
    try:
        result = subprocess.run(cmd, shell=True, capture_output=True, text=True, check=check)
        return result.stdout.strip(), result.stderr.strip()
    except subprocess.CalledProcessError as e:
        return None, e.stderr

def get_tailscale_status():
    global TAILSCALE_STATUS_CACHE
    stdout, stderr = run_command("tailscale status --json", check=False)
    if stdout:
        try:
            status = json.loads(stdout)
            TAILSCALE_STATUS_CACHE = status
            return status
        except json.JSONDecodeError:
            pass
    return {"BackendState": "NotRunning"}

def get_docker_containers():
    global CONTAINERS_CACHE
    try:
        client = docker.from_env()
        containers = []
        for container in client.containers.list(all=True):
            ports = []
            if container.ports:
                for port_info in container.ports.values():
                    if port_info:
                        for port in port_info:
                            if port.get('HostPort'):
                                ports.append({
                                    'container_port': port_info,
                                    'host_port': port['HostPort']
                                })

            container_info = {
                'id': container.id[:12],
                'name': container.name,
                'status': container.status,
                'image': container.image.tags[0] if container.image.tags else container.image.id[:12],
                'ports': ports,
                'network_mode': container.attrs.get('HostConfig', {}).get('NetworkMode', 'default')
            }
            containers.append(container_info)

        CONTAINERS_CACHE = containers
        return containers
    except Exception as e:
        print(f"Erro ao obter containers: {e}")
        return []

def authenticate_tailscale(token):
    if not token:
        return False, "Token não fornecido"

    # Primeiro, verificar se já está autenticado
    status = get_tailscale_status()
    if status.get('BackendState') == 'Running':
        return True, "Já autenticado"

    # Tentar autenticar
    stdout, stderr = run_command(f"tailscale up --authkey={token} --accept-routes", check=False)
    if stderr and "authentication" in stderr.lower():
        return False, f"Erro de autenticação: {stderr}"

    # Verificar se autenticação foi bem sucedida
    time.sleep(2)
    status = get_tailscale_status()
    if status.get('BackendState') == 'Running':
        return True, "Autenticado com sucesso"

    return False, "Falha na autenticação"

def create_funnel(port, service_name=""):
    status = get_tailscale_status()
    if status.get('BackendState') != 'Running':
        return False, "Tailscale não está rodando"

    # Verificar se a porta é válida para funnel
    valid_ports = [443, 8443, 10000]
    if int(port) not in valid_ports:
        return False, f"Porta {port} não é válida para Funnel. Use: {', '.join(map(str, valid_ports))}"

    # Criar o funnel
    stdout, stderr = run_command(f"tailscale funnel {port}", check=False)
    if stderr and "error" in stderr.lower():
        return False, f"Erro ao criar funnel: {stderr}"

    return True, f"Funnel criado para porta {port}"

def remove_funnel(port):
    stdout, stderr = run_command(f"tailscale funnel --bg=false {port}", check=False)
    return True, f"Funnel removido da porta {port}"

def list_funnels():
    stdout, stderr = run_command("tailscale funnel status", check=False)
    if stdout:
        return stdout
    return "Nenhum funnel ativo"

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/status')
def api_status():
    tailscale_status = get_tailscale_status()
    containers = get_docker_containers()
    config = load_config()

    return jsonify({
        'tailscale': tailscale_status,
        'containers': containers,
        'tunnels': config.get('tunnels', {}),
        'authenticated': tailscale_status.get('BackendState') == 'Running'
    })

@app.route('/api/authenticate', methods=['POST'])
def api_authenticate():
    data = request.get_json()
    token = data.get('token', '')

    success, message = authenticate_tailscale(token)

    if success:
        config = load_config()
        config['tailscale_token'] = token
        save_config(config)

    return jsonify({'success': success, 'message': message})

@app.route('/api/create-funnel', methods=['POST'])
def api_create_funnel():
    data = request.get_json()
    port = data.get('port')
    container_id = data.get('container_id', '')
    service_name = data.get('service_name', '')

    if not port:
        return jsonify({'success': False, 'message': 'Porta é obrigatória'})

    success, message = create_funnel(port, service_name)

    if success:
        config = load_config()
        config['tunnels'][str(port)] = {
            'container_id': container_id,
            'service_name': service_name,
            'created_at': time.time()
        }
        save_config(config)

    return jsonify({'success': success, 'message': message})

@app.route('/api/remove-funnel', methods=['POST'])
def api_remove_funnel():
    data = request.get_json()
    port = data.get('port')

    if not port:
        return jsonify({'success': False, 'message': 'Porta é obrigatória'})

    success, message = remove_funnel(port)

    if success:
        config = load_config()
        if str(port) in config['tunnels']:
            del config['tunnels'][str(port)]
            save_config(config)

    return jsonify({'success': success, 'message': message})

@app.route('/api/funnels')
def api_funnels():
    status_output = list_funnels()
    return jsonify({'status': status_output})

@app.route('/api/refresh')
def api_refresh():
    get_tailscale_status()
    get_docker_containers()
    return jsonify({'success': True})

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8080, debug=False)