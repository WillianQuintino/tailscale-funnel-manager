import { NextRequest, NextResponse } from 'next/server';
import { DockerService } from '@/app/lib/docker-service';

const dockerService = new DockerService();

export async function GET(_request: NextRequest) {
  try {
    const containers = await dockerService.listContainers();

    // Filtrar apenas containers em execução
    const runningContainers = containers
      .filter(c => c.state === 'running')
      .map(container => ({
        id: container.id,
        name: container.name,
        image: container.image,
        status: container.status,
        state: container.state,
        ports: container.ports.map(p => ({
          internal: p.privatePort,
          external: p.publicPort,
          type: p.type
        })),
        created: container.created
      }));

    return NextResponse.json(runningContainers);
  } catch (error) {
    console.error('Error fetching containers:', error);
    return NextResponse.json(
      { error: 'Failed to fetch containers' },
      { status: 500 }
    );
  }
}
