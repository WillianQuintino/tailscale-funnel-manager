import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface DockerContainer {
  id: string;
  name: string;
  image: string;
  status: string;
  state: string;
  ports: Array<{
    privatePort: number;
    publicPort?: number;
    type: string;
  }>;
  labels: Record<string, string>;
  created: string;
}

export interface CasaOSApp {
  id: string;
  name: string;
  description?: string;
  category?: string;
  port?: string;
  state: string;
  isCasaOSApp: boolean;
  icon?: string;
  url?: string;
}

export class DockerService {
  async listContainers(): Promise<DockerContainer[]> {
    try {
      const { stdout } = await execAsync('docker ps -a --format "{{json .}}"');
      const lines = stdout.trim().split('\n').filter(line => line.trim());

      const containers: DockerContainer[] = [];

      for (const line of lines) {
        try {
          const container = JSON.parse(line);

          // Get detailed info including ports
          const { stdout: inspectOutput } = await execAsync(`docker inspect ${container.ID}`);
          const inspectData = JSON.parse(inspectOutput)[0];

          const ports: Array<{ privatePort: number; publicPort?: number; type: string }> = [];

          if (inspectData.NetworkSettings?.Ports) {
            Object.entries(inspectData.NetworkSettings.Ports).forEach(([key, bindings]) => {
              const [portStr, protocol] = key.split('/');
              const privatePort = parseInt(portStr);

              if (Array.isArray(bindings) && bindings.length > 0) {
                bindings.forEach((binding: { HostPort?: string }) => {
                  ports.push({
                    privatePort,
                    publicPort: binding.HostPort ? parseInt(binding.HostPort) : undefined,
                    type: protocol
                  });
                });
              } else {
                ports.push({
                  privatePort,
                  type: protocol
                });
              }
            });
          }

          containers.push({
            id: container.ID,
            name: container.Names,
            image: container.Image,
            status: container.Status,
            state: container.State,
            ports,
            labels: inspectData.Config?.Labels || {},
            created: container.CreatedAt
          });
        } catch (parseError) {
          console.error('Error parsing container data:', parseError);
        }
      }

      return containers;
    } catch (error) {
      console.error('Error listing Docker containers:', error);
      return [];
    }
  }

  async getCasaOSApps(): Promise<CasaOSApp[]> {
    try {
      // Verificar se CasaOS está instalado
      const casaosDetected = await this.detectCasaOS();
      if (!casaosDetected) {
        return [];
      }

      // Listar containers com labels do CasaOS
      const containers = await this.listContainers();
      const casaosApps: CasaOSApp[] = [];

      for (const container of containers) {
        // Verificar se é um app do CasaOS baseado nas labels
        if (this.isCasaOSApp(container)) {
          const app: CasaOSApp = {
            id: container.id,
            name: this.extractAppName(container),
            description: container.labels['casa.app.description'] || container.image,
            category: container.labels['casa.app.category'] || 'Other',
            port: this.extractMainPort(container),
            state: container.state,
            isCasaOSApp: true,
            icon: container.labels['casa.app.icon'],
            url: container.labels['casa.app.url']
          };
          casaosApps.push(app);
        }
      }

      return casaosApps;
    } catch (error) {
      console.error('Error getting CasaOS apps:', error);
      return [];
    }
  }

  async detectCasaOS(): Promise<boolean> {
    try {
      // Verificar se existe container do CasaOS
      const { stdout } = await execAsync('docker ps --filter "name=casaos" --format "{{.Names}}"');
      if (stdout.trim()) {
        return true;
      }

      // Verificar se existe processo CasaOS
      try {
        await execAsync('pgrep -f casaos');
        return true;
      } catch {
        // Process not found
      }

      // Verificar se existe diretório CasaOS
      try {
        await execAsync('ls /etc/casaos');
        return true;
      } catch {
        // Directory not found
      }

      return false;
    } catch (error) {
      console.error('Error detecting CasaOS:', error);
      return false;
    }
  }

  async getDockerVersion(): Promise<string> {
    try {
      const { stdout } = await execAsync('docker --version');
      return stdout.trim();
    } catch (error) {
      console.error('Error getting Docker version:', error);
      return 'Unknown';
    }
  }

  async getContainerStats(): Promise<{ total: number; running: number }> {
    try {
      const containers = await this.listContainers();
      const running = containers.filter(c => c.state === 'running').length;

      return {
        total: containers.length,
        running
      };
    } catch (error) {
      console.error('Error getting container stats:', error);
      return { total: 0, running: 0 };
    }
  }

  private isCasaOSApp(container: DockerContainer): boolean {
    // Verificar labels comuns do CasaOS
    const casaOSLabels = [
      'casa.app.name',
      'casa.app.title',
      'casaos.app.name',
      'org.opencontainers.image.title'
    ];

    return casaOSLabels.some(label => label in container.labels) ||
           container.name.includes('casaos-') ||
           container.labels['io.casaos.app'] === 'true';
  }

  private extractAppName(container: DockerContainer): string {
    // Tentar extrair nome do app das labels
    return container.labels['casa.app.name'] ||
           container.labels['casa.app.title'] ||
           container.labels['casaos.app.name'] ||
           container.labels['org.opencontainers.image.title'] ||
           container.name.replace(/^casaos-/, '').replace(/^\//, '');
  }

  private extractMainPort(container: DockerContainer): string | undefined {
    if (container.ports.length === 0) return undefined;

    // Preferir portas HTTP/HTTPS comuns
    const commonPorts = [80, 443, 8080, 8443, 3000, 5000, 9000];

    for (const port of commonPorts) {
      const found = container.ports.find(p => p.privatePort === port);
      if (found) {
        return found.privatePort.toString();
      }
    }

    // Retornar a primeira porta disponível
    return container.ports[0].privatePort.toString();
  }

  async startContainer(containerId: string): Promise<boolean> {
    try {
      await execAsync(`docker start ${containerId}`);
      return true;
    } catch (error) {
      console.error('Error starting container:', error);
      return false;
    }
  }

  async stopContainer(containerId: string): Promise<boolean> {
    try {
      await execAsync(`docker stop ${containerId}`);
      return true;
    } catch (error) {
      console.error('Error stopping container:', error);
      return false;
    }
  }

  async restartContainer(containerId: string): Promise<boolean> {
    try {
      await execAsync(`docker restart ${containerId}`);
      return true;
    } catch (error) {
      console.error('Error restarting container:', error);
      return false;
    }
  }

  async getContainerLogs(containerId: string, lines: number = 100): Promise<string> {
    try {
      const { stdout } = await execAsync(`docker logs --tail ${lines} ${containerId}`);
      return stdout;
    } catch (error) {
      console.error('Error getting container logs:', error);
      return '';
    }
  }
}