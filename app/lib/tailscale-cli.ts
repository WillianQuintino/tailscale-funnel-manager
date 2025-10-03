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
    const { port, path = '/', protocol = 'https', serveMode = 'proxy', target } = config;

    if (!this.isValidPort(port)) {
      return {
        success: false,
        error: `Invalid port ${port}. Funnel only supports ports 443, 8443, and 10000.`,
      };
    }

    let command = `tailscale funnel`;

    if (serveMode === 'proxy' && target) {
      command += ` ${protocol}:/${path}=${target}`;
    } else if (serveMode === 'files' && target) {
      command += ` ${path}=${target}`;
    } else {
      command += ` ${port}`;
    }

    return this.executeCommand(command);
  }

  static async stopFunnel(port: number): Promise<CommandResult> {
    return this.executeCommand(`tailscale funnel off ${port}`);
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