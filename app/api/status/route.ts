import { NextRequest, NextResponse } from 'next/server';
import { DockerService } from '@/app/lib/docker-service';
import { AuthService } from '@/app/lib/casaos-auth';

const dockerService = new DockerService();
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

    // Buscar status do Tailscale
    const port = process.env.PORT || 3002;
    const tailscaleResponse = await fetch(`http://localhost:${port}/api/tailscale/status`);
    const tailscaleStatus = tailscaleResponse.ok ? await tailscaleResponse.json() : { isRunning: false };

    // Buscar containers Docker
    const containers = await dockerService.listContainers();

    // Buscar apps CasaOS
    const casaosApps = await dockerService.getCasaOSApps();

    // Buscar informações do sistema
    const dockerVersion = await dockerService.getDockerVersion();
    const containerStats = await dockerService.getContainerStats();
    const casaosDetected = await dockerService.detectCasaOS();

    // Buscar funnels ativos (simulado por enquanto)
    const funnelsResponse = await fetch(`http://localhost:${port}/api/funnel/status`);
    const funnelStatus = funnelsResponse.ok ? await funnelsResponse.json() : { isEnabled: false, activeServices: 0 };

    return NextResponse.json({
      tailscale: {
        connected: tailscaleStatus.isRunning,
        hostname: tailscaleStatus.hostname,
        nodeKey: tailscaleStatus.nodeKey
      },
      containers,
      casaosApps,
      funnels: [], // Will be populated by actual funnel data
      system: {
        docker: {
          version: dockerVersion,
          containers: containerStats.total,
          running: containerStats.running
        },
        casaos: {
          detected: casaosDetected,
          version: casaosDetected ? 'Unknown' : undefined
        }
      },
      funnel: funnelStatus
    });
  } catch (error) {
    console.error('Error fetching status:', error);
    return NextResponse.json(
      { error: 'Failed to fetch status' },
      { status: 500 }
    );
  }
}