import { NextRequest } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export interface AuthConfig {
  enabled: boolean;
  type: 'casaos' | 'tailscale' | 'custom';
  casaosUrl?: string;
  customCredentials?: {
    username: string;
    password: string;
  };
}

export interface AuthResult {
  authenticated: boolean;
  user?: {
    id: string;
    username: string;
    role: string;
  };
  error?: string;
}

export class AuthService {
  private authConfig: AuthConfig;

  constructor() {
    this.authConfig = {
      enabled: process.env.AUTH_ENABLED === 'true',
      type: (process.env.AUTH_TYPE as 'casaos' | 'tailscale' | 'custom') || 'tailscale',
      casaosUrl: process.env.CASAOS_URL || 'http://localhost:80',
      customCredentials: {
        username: process.env.CUSTOM_USERNAME || 'admin',
        password: process.env.CUSTOM_PASSWORD || 'admin'
      }
    };
  }

  async authenticate(request: NextRequest): Promise<AuthResult> {
    if (!this.authConfig.enabled) {
      return { authenticated: true };
    }

    switch (this.authConfig.type) {
      case 'casaos':
        return this.authenticateWithCasaOS(request);
      case 'tailscale':
        return this.authenticateWithTailscale(request);
      case 'custom':
        return this.authenticateWithCustom(request);
      default:
        return { authenticated: false, error: 'Invalid auth type' };
    }
  }

  private async authenticateWithCasaOS(request: NextRequest): Promise<AuthResult> {
    try {
      const authHeader = request.headers.get('authorization');
      const sessionCookie = request.cookies.get('casaos-session');

      if (!authHeader && !sessionCookie) {
        return { authenticated: false, error: 'No authentication provided' };
      }

      // Verificar se CasaOS está rodando
      const casaosRunning = await this.isCasaOSRunning();
      if (!casaosRunning) {
        // Fallback para auth Tailscale se CasaOS não estiver disponível
        return this.authenticateWithTailscale(request);
      }

      // Tentar autenticar com CasaOS API
      if (sessionCookie) {
        const result = await this.validateCasaOSSession(sessionCookie.value);
        if (result.authenticated) {
          return result;
        }
      }

      if (authHeader) {
        const result = await this.validateCasaOSToken(authHeader);
        if (result.authenticated) {
          return result;
        }
      }

      return { authenticated: false, error: 'CasaOS authentication failed' };
    } catch (error) {
      console.error('CasaOS auth error:', error);
      // Fallback para Tailscale
      return this.authenticateWithTailscale(request);
    }
  }

  private async authenticateWithTailscale(request: NextRequest): Promise<AuthResult> {
    try {
      // Verificar se a requisição vem do Tailscale
      const clientIP = this.getClientIP(request);
      const isTailscaleIP = await this.isTailscaleIP(clientIP);

      if (isTailscaleIP) {
        // Obter informações do usuário Tailscale
        const user = await this.getTailscaleUser(clientIP);
        return {
          authenticated: true,
          user: user || {
            id: 'tailscale-user',
            username: 'Tailscale User',
            role: 'user'
          }
        };
      }

      // Verificar se tem acesso local (localhost)
      if (this.isLocalhost(clientIP)) {
        return {
          authenticated: true,
          user: {
            id: 'local-user',
            username: 'Local User',
            role: 'admin'
          }
        };
      }

      return { authenticated: false, error: 'Access denied: Not from Tailscale network' };
    } catch (error) {
      console.error('Tailscale auth error:', error);
      return { authenticated: false, error: 'Tailscale authentication failed' };
    }
  }

  private async authenticateWithCustom(request: NextRequest): Promise<AuthResult> {
    try {
      const authHeader = request.headers.get('authorization');

      if (!authHeader || !authHeader.startsWith('Basic ')) {
        return { authenticated: false, error: 'Basic authentication required' };
      }

      const base64Credentials = authHeader.split(' ')[1];
      const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
      const [username, password] = credentials.split(':');

      if (username === this.authConfig.customCredentials?.username &&
          password === this.authConfig.customCredentials?.password) {
        return {
          authenticated: true,
          user: {
            id: 'custom-user',
            username: username,
            role: 'admin'
          }
        };
      }

      return { authenticated: false, error: 'Invalid credentials' };
    } catch (error) {
      console.error('Custom auth error:', error);
      return { authenticated: false, error: 'Custom authentication failed' };
    }
  }

  private async isCasaOSRunning(): Promise<boolean> {
    try {
      // Verificar container CasaOS
      const { stdout } = await execAsync('docker ps --filter "name=casaos" --format "{{.Status}}"');
      return stdout.trim().includes('Up');
    } catch {
      return false;
    }
  }

  private async validateCasaOSSession(sessionId: string): Promise<AuthResult> {
    try {
      // Fazer requisição para CasaOS API para validar sessão
      const response = await fetch(`${this.authConfig.casaosUrl}/v1/user/info`, {
        headers: {
          'Cookie': `casaos-session=${sessionId}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return {
          authenticated: true,
          user: {
            id: userData.id || 'casaos-user',
            username: userData.username || 'CasaOS User',
            role: userData.role || 'user'
          }
        };
      }

      return { authenticated: false, error: 'Invalid CasaOS session' };
    } catch (error) {
      console.error('CasaOS session validation error:', error);
      return { authenticated: false, error: 'CasaOS session validation failed' };
    }
  }

  private async validateCasaOSToken(authHeader: string): Promise<AuthResult> {
    try {
      // Extrair token do header
      const token = authHeader.replace('Bearer ', '');

      // Fazer requisição para CasaOS API para validar token
      const response = await fetch(`${this.authConfig.casaosUrl}/v1/user/info`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const userData = await response.json();
        return {
          authenticated: true,
          user: {
            id: userData.id || 'casaos-user',
            username: userData.username || 'CasaOS User',
            role: userData.role || 'user'
          }
        };
      }

      return { authenticated: false, error: 'Invalid CasaOS token' };
    } catch (error) {
      console.error('CasaOS token validation error:', error);
      return { authenticated: false, error: 'CasaOS token validation failed' };
    }
  }

  private getClientIP(request: NextRequest): string {
    const forwarded = request.headers.get('x-forwarded-for');
    const realIP = request.headers.get('x-real-ip');
    const remoteAddress = request.headers.get('remote-addr');

    if (forwarded) {
      return forwarded.split(',')[0].trim();
    }

    return realIP || remoteAddress || '127.0.0.1';
  }

  private async isTailscaleIP(ip: string): Promise<boolean> {
    try {
      // Obter status do Tailscale para verificar se o IP está na rede
      const { stdout } = await execAsync('tailscale status --json');
      const status = JSON.parse(stdout);

      // Verificar se o IP está na lista de peers
      if (status.Peer) {
        for (const peer of Object.values(status.Peer) as { TailscaleIPs?: string[] }[]) {
          if (peer.TailscaleIPs && peer.TailscaleIPs.includes(ip)) {
            return true;
          }
        }
      }

      // Verificar se é o IP do próprio nó
      if (status.Self && status.Self.TailscaleIPs && status.Self.TailscaleIPs.includes(ip)) {
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error checking Tailscale IP:', error);
      return false;
    }
  }

  private async getTailscaleUser(ip: string): Promise<{ id: string; username: string; role: string } | null> {
    try {
      const { stdout } = await execAsync('tailscale status --json');
      const status = JSON.parse(stdout);

      // Procurar o peer com este IP
      if (status.Peer) {
        for (const [nodeKey, peer] of Object.entries(status.Peer) as [string, { TailscaleIPs?: string[]; DNSName?: string; HostName?: string }][]) {
          if (peer.TailscaleIPs && peer.TailscaleIPs.includes(ip)) {
            return {
              id: nodeKey,
              username: peer.DNSName || peer.HostName || 'Tailscale User',
              role: 'user'
            };
          }
        }
      }

      // Se for o próprio nó
      if (status.Self && status.Self.TailscaleIPs && status.Self.TailscaleIPs.includes(ip)) {
        return {
          id: status.Self.PublicKey || 'self',
          username: status.Self.DNSName || status.Self.HostName || 'Local User',
          role: 'admin'
        };
      }

      return null;
    } catch (error) {
      console.error('Error getting Tailscale user:', error);
      return null;
    }
  }

  private isLocalhost(ip: string): boolean {
    const localIPs = ['127.0.0.1', '::1', 'localhost'];
    return localIPs.includes(ip) || ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
  }

  // Método para gerar login URL do CasaOS
  getCasaOSLoginUrl(): string {
    return `${this.authConfig.casaosUrl}/login`;
  }

  // Método para verificar se auth está habilitado
  isAuthEnabled(): boolean {
    return this.authConfig.enabled;
  }

  // Método para obter tipo de auth atual
  getAuthType(): string {
    return this.authConfig.type;
  }
}