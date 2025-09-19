import { NextRequest, NextResponse } from 'next/server';
import { TailscaleCLI } from '@/app/lib/tailscale-cli';

export async function GET(_request: NextRequest) {
  try {
    const services = await TailscaleCLI.getFunnelStatus();

    return NextResponse.json({
      isEnabled: services.length > 0,
      activeServices: services.length,
      services,
    });
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to get Funnel status' },
      { status: 500 }
    );
  }
}