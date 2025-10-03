import { NextRequest, NextResponse } from 'next/server';
import { DockerService } from '@/app/lib/docker-service';

const dockerService = new DockerService();

interface NetworkService {
  name: string;
  container: string;
  port: number;
  protocol: string;
  type: string;
  url?: string;
  hasFunnel?: boolean;
}

export async function GET(_request: NextRequest) {
  try {
    const containers = await dockerService.listContainers();
    const services: NetworkService[] = [];

    // Processar cada container e suas portas
    for (const container of containers) {
      if (container.state !== 'running') continue;

      for (const port of container.ports) {
        const service: NetworkService = {
          name: `${container.name}:${port.privatePort}`,
          container: container.name,
          port: port.privatePort,
          protocol: port.type || 'tcp',
          type: determineServiceType(port.privatePort),
          url: port.publicPort ? `http://localhost:${port.publicPort}` : undefined,
          hasFunnel: false // TODO: verificar se tem funnel ativo
        };

        services.push(service);
      }
    }

    // Ordenar por tipo de serviço
    services.sort((a, b) => {
      const typeOrder: Record<string, number> = {
        'SSH': 1,
        'HTTP': 2,
        'HTTPS': 3,
        'DNS': 4,
        'Other': 5
      };
      return (typeOrder[a.type] || 99) - (typeOrder[b.type] || 99);
    });

    return NextResponse.json({
      services,
      total: services.length
    });
  } catch (error) {
    console.error('Error listing services:', error);
    return NextResponse.json(
      { error: 'Failed to list services' },
      { status: 500 }
    );
  }
}

// Determinar tipo de serviço baseado na porta
function determineServiceType(port: number): string {
  const serviceTypes: Record<number, string> = {
    22: 'SSH',
    53: 'DNS',
    80: 'HTTP',
    443: 'HTTPS',
    3000: 'HTTP',
    3001: 'HTTP',
    3002: 'HTTP',
    5000: 'HTTP',
    8000: 'HTTP',
    8080: 'HTTP',
    8443: 'HTTPS',
    8888: 'HTTP',
    9000: 'HTTP',
    9090: 'HTTP',
    10000: 'HTTP'
  };

  return serviceTypes[port] || 'Other';
}
