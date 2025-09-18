#!/usr/bin/env python3
"""
Monitor de containers para descoberta automática de serviços CasaOS
"""

import os
import json
import time
import docker
import threading
from datetime import datetime

class ContainerMonitor:
    def __init__(self, data_dir='/app/data'):
        self.data_dir = data_dir
        self.containers_file = os.path.join(data_dir, 'containers.json')
        self.client = None
        self.running = False
        self.last_scan = None

        # Criar diretório se não existir
        os.makedirs(data_dir, exist_ok=True)

        # Conectar ao Docker
        self.connect_docker()

    def connect_docker(self):
        """Conectar ao Docker daemon"""
        try:
            self.client = docker.from_env()
            # Testar conexão
            self.client.ping()
            print("Conectado ao Docker daemon")
            return True
        except Exception as e:
            print(f"Erro ao conectar ao Docker: {e}")
            self.client = None
            return False

    def get_container_info(self, container):
        """Extrair informações relevantes do container"""
        try:
            # Informações básicas
            info = {
                'id': container.id[:12],
                'name': container.name,
                'status': container.status,
                'created': container.attrs['Created'],
                'image': {
                    'name': container.image.tags[0] if container.image.tags else container.image.id[:12],
                    'id': container.image.id[:12]
                },
                'ports': [],
                'networks': {},
                'labels': container.labels or {},
                'env_vars': {},
                'mounts': [],
                'compose_project': None,
                'casaos_info': {}
            }

            # Portas expostas
            if container.ports:
                for container_port, host_ports in container.ports.items():
                    if host_ports:
                        for host_port in host_ports:
                            info['ports'].append({
                                'container_port': container_port,
                                'host_ip': host_port.get('HostIp', '0.0.0.0'),
                                'host_port': host_port.get('HostPort'),
                                'protocol': 'tcp' if '/' not in container_port else container_port.split('/')[1]
                            })

            # Redes
            if container.attrs.get('NetworkSettings', {}).get('Networks'):
                for net_name, net_info in container.attrs['NetworkSettings']['Networks'].items():
                    info['networks'][net_name] = {
                        'ip_address': net_info.get('IPAddress'),
                        'gateway': net_info.get('Gateway'),
                        'network_id': net_info.get('NetworkID', '')[:12]
                    }

            # Variáveis de ambiente (filtrar senhas)
            env_vars = container.attrs.get('Config', {}).get('Env', [])
            for env_var in env_vars:
                if '=' in env_var:
                    key, value = env_var.split('=', 1)
                    # Filtrar informações sensíveis
                    if any(sensitive in key.lower() for sensitive in ['password', 'secret', 'key', 'token']):
                        value = '[HIDDEN]'
                    info['env_vars'][key] = value

            # Montagens
            if container.attrs.get('Mounts'):
                for mount in container.attrs['Mounts']:
                    info['mounts'].append({
                        'source': mount.get('Source'),
                        'destination': mount.get('Destination'),
                        'type': mount.get('Type'),
                        'read_only': mount.get('RW', True) == False
                    })

            # Detectar se é um projeto docker-compose
            if 'com.docker.compose.project' in info['labels']:
                info['compose_project'] = info['labels']['com.docker.compose.project']

            # Detectar informações específicas do CasaOS
            self.detect_casaos_info(info)

            # Detectar tipo de aplicação
            info['app_type'] = self.detect_app_type(info)

            return info

        except Exception as e:
            print(f"Erro ao extrair informações do container {container.name}: {e}")
            return None

    def detect_casaos_info(self, info):
        """Detectar informações específicas do CasaOS baseado em labels e características"""
        labels = info['labels']

        # CasaOS específico
        if 'casaos.name' in labels:
            info['casaos_info']['app_name'] = labels['casaos.name']

        if 'casaos.category' in labels:
            info['casaos_info']['category'] = labels['casaos.category']

        if 'casaos.description' in labels:
            info['casaos_info']['description'] = labels['casaos.description']

        # Traefik labels (comum no CasaOS)
        traefik_labels = {k: v for k, v in labels.items() if k.startswith('traefik.')}
        if traefik_labels:
            info['casaos_info']['traefik'] = traefik_labels

        # Detectar interface web
        web_ports = self.detect_web_ports(info)
        if web_ports:
            info['casaos_info']['web_ports'] = web_ports

    def detect_web_ports(self, info):
        """Detectar portas que provavelmente servem interfaces web"""
        web_ports = []
        common_web_ports = [80, 443, 8080, 8443, 3000, 5000, 8000, 9000]

        for port_info in info['ports']:
            try:
                port_num = int(port_info['host_port'])
                if port_num in common_web_ports or port_num > 3000:
                    web_ports.append(port_info)
            except (ValueError, TypeError):
                continue

        return web_ports

    def detect_app_type(self, info):
        """Detectar tipo de aplicação baseado na imagem e portas"""
        image_name = info['image']['name'].lower()

        # Web servers
        if any(web in image_name for web in ['nginx', 'apache', 'httpd']):
            return 'web_server'

        # Databases
        if any(db in image_name for db in ['mysql', 'postgres', 'mongodb', 'redis']):
            return 'database'

        # Media servers
        if any(media in image_name for media in ['plex', 'jellyfin', 'emby']):
            return 'media_server'

        # Home automation
        if any(ha in image_name for ha in ['homeassistant', 'openhab']):
            return 'home_automation'

        # Development tools
        if any(dev in image_name for dev in ['gitea', 'gitlab', 'jenkins']):
            return 'development'

        # Se tem portas web, provavelmente é uma aplicação web
        if info['casaos_info'].get('web_ports'):
            return 'web_app'

        return 'other'

    def scan_containers(self):
        """Escanear todos os containers"""
        if not self.client:
            if not self.connect_docker():
                return {}

        containers_data = {}

        try:
            # Obter todos os containers (incluindo parados)
            containers = self.client.containers.list(all=True)

            for container in containers:
                info = self.get_container_info(container)
                if info:
                    containers_data[container.id] = info

            self.last_scan = datetime.now().isoformat()

            # Salvar dados
            self.save_containers_data(containers_data)

            print(f"Escaneados {len(containers_data)} containers")
            return containers_data

        except Exception as e:
            print(f"Erro ao escanear containers: {e}")
            return {}

    def save_containers_data(self, data):
        """Salvar dados dos containers"""
        try:
            containers_info = {
                'last_update': self.last_scan,
                'containers': data,
                'summary': {
                    'total': len(data),
                    'running': len([c for c in data.values() if c['status'] == 'running']),
                    'with_web_ports': len([c for c in data.values() if c['casaos_info'].get('web_ports')])
                }
            }

            with open(self.containers_file, 'w') as f:
                json.dump(containers_info, f, indent=2)

        except Exception as e:
            print(f"Erro ao salvar dados dos containers: {e}")

    def load_containers_data(self):
        """Carregar dados dos containers salvos"""
        try:
            if os.path.exists(self.containers_file):
                with open(self.containers_file, 'r') as f:
                    return json.load(f)
        except Exception as e:
            print(f"Erro ao carregar dados dos containers: {e}")
        return {}

    def monitor_events(self):
        """Monitor de eventos do Docker"""
        if not self.client:
            return

        try:
            for event in self.client.events(decode=True):
                if event.get('Type') == 'container':
                    action = event.get('Action')
                    if action in ['start', 'stop', 'create', 'destroy']:
                        print(f"Container event: {action} - {event.get('Actor', {}).get('Attributes', {}).get('name', 'unknown')}")
                        # Re-escanear após evento
                        threading.Timer(2.0, self.scan_containers).start()

        except Exception as e:
            print(f"Erro no monitor de eventos: {e}")

    def start_monitoring(self):
        """Iniciar monitoramento"""
        self.running = True

        # Scan inicial
        self.scan_containers()

        # Iniciar monitor de eventos em thread separada
        event_thread = threading.Thread(target=self.monitor_events, daemon=True)
        event_thread.start()

        # Loop principal - re-scan periódico
        while self.running:
            try:
                time.sleep(300)  # Re-scan a cada 5 minutos
                if self.running:
                    self.scan_containers()
            except KeyboardInterrupt:
                self.stop_monitoring()
                break

    def stop_monitoring(self):
        """Parar monitoramento"""
        self.running = False
        print("Monitor de containers parado")

def main():
    """Função principal"""
    print("Iniciando monitor de containers CasaOS...")

    monitor = ContainerMonitor()

    try:
        monitor.start_monitoring()
    except KeyboardInterrupt:
        print("\nParando monitor...")
        monitor.stop_monitoring()

if __name__ == '__main__':
    main()