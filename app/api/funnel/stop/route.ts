import { NextRequest, NextResponse } from 'next/server';
import { TailscaleCLI } from '@/app/lib/tailscale-cli';
import { z } from 'zod';

const stopFunnelSchema = z.object({
  port: z.number(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { port } = stopFunnelSchema.parse(body);

    const result = await TailscaleCLI.stopFunnel(port);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to stop Funnel' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Funnel stopped successfully',
      output: result.output,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'Invalid request data', details: error.issues },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'Failed to stop Funnel service' },
      { status: 500 }
    );
  }
}