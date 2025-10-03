import { exec } from 'child_process';
import { promisify } from 'util';
import { CommandResult, FunnelConfig, FunnelService, TailscaleStatus, FunnelPort } from '@/app/types/tailscale';

const execAsync = promisify(exec);

export class TailscaleCLI {
  private static async executeCommand(command: string): Promise<CommandResult> {
    try {
      const { stdout, stderr } = await execAsync(command, {
        encoding: 'utf8',
        timeout: 30000,
      });

      return {
        success: true,
        output: stdout.trim(),
        error: stderr ? stderr.trim() : undefined,
        exitCode: 0,
      };
    } catch (error: unknown) {
      const execError = error as { stdout?: string; message?: string; code?: number };
      return {
        success: false,
        output: execError.stdout ? execError.stdout.trim() : undefined,
        error: execError.message || 'Command execution failed',
        exitCode: execError.code || 1,
      };
    }
  }

  static async getStatus(): Promise<TailscaleStatus> {
    const result = await this.executeCommand('tailscale status --json');

    if (!result.success) {
      return {
        isRunning: false,
        isLoggedIn: false,
      };
    }

    try {
      const status = JSON.parse(result.output || '{}');
      const self = status.Self || {};
      const backendState = status.BackendState || '';

      // Verificar se está realmente logado (não apenas rodando)
      const isLoggedIn = backendState === 'Running' && !!self.Online;

      return {
        isRunning: backendState !== 'NoState',
        isLoggedIn: isLoggedIn,
        hostname: self.HostName,
        ipAddress: self.TailscaleIPs?.[0],
        magicDNS: self.DNSName,
        version: status.Version,
        hasFunnelEnabled: self.Capabilities?.includes('funnel'),
      };
    } catch {
      return {
        isRunning: false,
        isLoggedIn: false,
      };
    }
  }

  static async getFunnelStatus(): Promise<FunnelService[]> {
    const result = await this.executeCommand('tailscale funnel status');

    if (!result.success) {
      return [];
    }

    return this.parseFunnelStatus(result.output || '');
  }

  static async startFunnel(config: FunnelConfig): Promise<CommandResult> {
    const { port, serveMode = 'proxy', target } = config;

    // Usar a porta externa do Docker diretamente no funnel
    if (serveMode === 'proxy' && target) {
      // Garantir que o target use localhost ou 127.0.0.1
      let normalizedTarget = target;
      if (target.includes('://localhost:') || target.includes('://127.0.0.1:')) {
        normalizedTarget = target;
      } else {
        // Extrair porta do target e normalizar para localhost
        const portMatch = target.match(/:(\d+)/);
        const targetPort = portMatch ? portMatch[1] : '80';
        normalizedTarget = `http://127.0.0.1:${targetPort}`;
      }

      // Comando simplificado: tailscale funnel --bg {porta_externa} expõe diretamente a porta
      // Exemplo: tailscale funnel --bg 3001
      const funnelCommand = `tailscale funnel --bg ${port}`;

      console.log('Creating funnel on port:', port, 'targeting:', normalizedTarget);
      console.log('Executing command:', funnelCommand);

      return this.executeCommand(funnelCommand);
    }

    return {
      success: false,
      error: 'Invalid configuration. serveMode must be "proxy" and target must be specified.',
    };
  }

  static async stopFunnel(port: number): Promise<CommandResult> {
    // Nova sintaxe v1.88+: desabilitar serve na porta
    // Se for porta 443, usar: tailscale serve reset
    // Se for outra porta: tailscale serve --https PORT off
    if (port === 443) {
      return this.executeCommand('tailscale serve reset');
    } else {
      return this.executeCommand(`tailscale serve --https ${port} off`);
    }
  }

  static async servePath(port: number, path: string, target: string): Promise<CommandResult> {
    const command = `tailscale serve ${port} ${path} ${target}`;
    return this.executeCommand(command);
  }

  static async serveOff(port: number): Promise<CommandResult> {
    return this.executeCommand(`tailscale serve off ${port}`);
  }

  static async getServeStatus(): Promise<CommandResult> {
    return this.executeCommand('tailscale serve status');
  }

  private static parseFunnelStatus(output: string): FunnelService[] {
    const services: FunnelService[] = [];
    const lines = output.split('\n').filter(line => line.trim());

    let currentService: Partial<FunnelService> | null = null;

    for (const line of lines) {
      if (line.includes('https://')) {
        const urlMatch = line.match(/https:\/\/[\w\-\.]+/);
        if (urlMatch && currentService) {
          currentService.url = urlMatch[0];
        }
      } else if (line.includes(':')) {
        const [key, value] = line.split(':').map(s => s.trim());

        if (key === 'Port') {
          const port = parseInt(value);
          if (!isNaN(port)) {
            if (currentService) {
              services.push(currentService as FunnelService);
            }
            currentService = {
              id: `funnel-${port}-${Date.now()}`,
              name: `Service on port ${port}`,
              port,
              status: 'active',
              protocol: 'https',
              createdAt: new Date().toISOString(),
            };
          }
        } else if (currentService) {
          if (key === 'Path') currentService.path = value;
        }
      }
    }

    if (currentService) {
      services.push(currentService as FunnelService);
    }

    return services;
  }

  private static isValidPort(port: number): port is FunnelPort {
    return port === 443 || port === 8443 || port === 10000;
  }

  static async checkAvailability(): Promise<boolean> {
    const result = await this.executeCommand('tailscale version');
    return result.success;
  }

  static async login(): Promise<CommandResult> {
    return this.executeCommand('tailscale up');
  }

  static async logout(): Promise<CommandResult> {
    return this.executeCommand('tailscale down');
  }

  static async getNetworkInfo(): Promise<CommandResult> {
    return this.executeCommand('tailscale netcheck');
  }
}