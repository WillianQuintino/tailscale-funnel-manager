import { NextRequest, NextResponse } from 'next/server';
import { TailscaleCLI } from '@/app/lib/tailscale-cli';

export async function GET(_request: NextRequest) {
  try {
    const services = await TailscaleCLI.getFunnelStatus();
    const serveStatus = await TailscaleCLI.getServeStatus();

    const enrichedServices = services.map(service => ({
      ...service,
      serveDetails: serveStatus.output,
    }));

    return NextResponse.json(enrichedServices);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to get services' },
      { status: 500 }
    );
  }
}