import { NextRequest, NextResponse } from 'next/server';
import { TailscaleCLI } from '@/app/lib/tailscale-cli';

export async function GET(_request: NextRequest) {
  try {
    const status = await TailscaleCLI.getStatus();
    return NextResponse.json(status);
  } catch (_error) {
    return NextResponse.json(
      { error: 'Failed to get Tailscale status' },
      { status: 500 }
    );
  }
}