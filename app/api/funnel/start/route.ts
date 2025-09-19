import { NextRequest, NextResponse } from 'next/server';
import { TailscaleCLI } from '@/app/lib/tailscale-cli';
import { z } from 'zod';

const startFunnelSchema = z.object({
  port: z.number().refine(
    (port) => port === 443 || port === 8443 || port === 10000,
    { message: 'Port must be 443, 8443, or 10000' }
  ),
  path: z.string().optional().default('/'),
  protocol: z.enum(['http', 'https']).optional().default('https'),
  serveMode: z.enum(['proxy', 'files', 'text']).optional().default('proxy'),
  target: z.string().optional(),
  description: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const config = startFunnelSchema.parse(body);

    const result = await TailscaleCLI.startFunnel(config);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || 'Failed to start Funnel' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Funnel started successfully',
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
      { error: 'Failed to start Funnel service' },
      { status: 500 }
    );
  }
}