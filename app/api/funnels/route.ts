import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';
import { AuthService } from '@/app/lib/casaos-auth';

const execAsync = promisify(exec);
const authService = new AuthService();

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticação se habilitada
    if (authService.isAuthEnabled()) {
      const authResult = await authService.authenticate(request);
      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    // Listar funnels ativos
    try {
      const { stdout } = await execAsync('tailscale funnel status --json');
      const funnelStatus = JSON.parse(stdout);

      const funnels = [];
      if (funnelStatus && funnelStatus.Profiles) {
        for (const profile of Object.values(funnelStatus.Profiles) as { Web?: Record<string, unknown>; CertDomains?: string[] }[]) {
          if (profile.Web) {
            for (const [port] of Object.entries(profile.Web) as [string, unknown][]) {
              funnels.push({
                id: `funnel-${port}`,
                name: `Funnel ${port}`,
                port,
                enabled: true,
                status: 'running',
                url: `https://${profile.CertDomains?.[0] || 'unknown'}:${port}`,
                targetContainer: 'unknown',
                targetPort: port,
                protocol: 'https'
              });
            }
          }
        }
      }

      return NextResponse.json(funnels);
    } catch {
      // Se não conseguir obter status, retornar lista vazia
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error('Error fetching funnels:', error);
    return NextResponse.json(
      { error: 'Failed to fetch funnels' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticação se habilitada
    if (authService.isAuthEnabled()) {
      const authResult = await authService.authenticate(request);
      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    const { name, port, targetContainer, targetPort, protocol } = await request.json();

    if (!name || !port || !targetPort) {
      return NextResponse.json(
        { error: 'Missing required fields' },
        { status: 400 }
      );
    }

    // Verificar se Tailscale está rodando
    try {
      const { stdout } = await execAsync('tailscale status --json');
      const status = JSON.parse(stdout);

      if (status.BackendState !== 'Running') {
        return NextResponse.json(
          { error: 'Tailscale is not running' },
          { status: 500 }
        );
      }

      // Verificar se funnel está habilitado
      try {
        await execAsync('tailscale funnel status');
      } catch {
        return NextResponse.json(
          { error: 'Funnel is not enabled for this node' },
          { status: 500 }
        );
      }

      // Criar o funnel
      const target = targetContainer ? `${targetContainer}:${targetPort}` : `localhost:${targetPort}`;
      await execAsync(`tailscale funnel ${port} ${protocol}://${target}`);

      // Aguardar um pouco para o funnel se estabelecer
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Obter informações do funnel criado
      const { stdout: funnelOutput } = await execAsync('tailscale funnel status --json');
      const funnelStatus = JSON.parse(funnelOutput);

      let funnelUrl = `https://unknown:${port}`;
      if (funnelStatus && funnelStatus.Profiles) {
        for (const profile of Object.values(funnelStatus.Profiles) as { Web?: Record<string, unknown>; CertDomains?: string[] }[]) {
          if (profile.CertDomains && profile.CertDomains.length > 0) {
            funnelUrl = `https://${profile.CertDomains[0]}:${port}`;
            break;
          }
        }
      }

      const createdFunnel = {
        id: `funnel-${port}-${Date.now()}`,
        name,
        port,
        targetContainer: targetContainer || 'localhost',
        targetPort,
        protocol,
        enabled: true,
        status: 'running',
        url: funnelUrl
      };

      return NextResponse.json(createdFunnel);
    } catch (error) {
      console.error('Funnel creation error:', error);
      return NextResponse.json(
        { error: 'Failed to create funnel' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    // Verificar autenticação se habilitada
    if (authService.isAuthEnabled()) {
      const authResult = await authService.authenticate(request);
      if (!authResult.authenticated) {
        return NextResponse.json(
          { error: 'Authentication required' },
          { status: 401 }
        );
      }
    }

    const { searchParams } = new URL(request.url);
    const port = searchParams.get('port');

    if (!port) {
      return NextResponse.json(
        { error: 'Port parameter is required' },
        { status: 400 }
      );
    }

    // Remover o funnel
    try {
      await execAsync(`tailscale funnel ${port} off`);

      return NextResponse.json({
        success: true,
        message: `Funnel on port ${port} stopped successfully`
      });
    } catch (error) {
      console.error('Funnel removal error:', error);
      return NextResponse.json(
        { error: 'Failed to stop funnel' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}