import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

export async function POST(request: NextRequest) {
  try {
    const { authKey } = await request.json();

    if (!authKey || !authKey.startsWith('tskey-')) {
      return NextResponse.json(
        { error: 'Invalid auth key format' },
        { status: 400 }
      );
    }

    // Verificar se Tailscale está instalado
    try {
      await execAsync('tailscale version');
    } catch {
      return NextResponse.json(
        { error: 'Tailscale not installed or not in PATH' },
        { status: 500 }
      );
    }

    // Parar Tailscale se estiver rodando
    try {
      await execAsync('tailscale down');
    } catch {
      // Ignorar erro se já estiver parado
    }

    // Fazer login com o auth key
    try {
      const { stdout, stderr } = await execAsync(`tailscale up --authkey=${authKey} --accept-routes --accept-dns`);

      // Verificar se há URL de login na saída
      const output = stdout + stderr;
      const loginUrlMatch = output.match(/https:\/\/login\.tailscale\.com\/[^\s]+/);

      if (loginUrlMatch) {
        return NextResponse.json({
          requiresLogin: true,
          loginUrl: loginUrlMatch[0],
          message: 'Please complete authentication in your browser'
        });
      }

      // Aguardar alguns segundos para conexão
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Verificar se conectou
      const { stdout: statusOutput } = await execAsync('tailscale status --json');
      const status = JSON.parse(statusOutput);

      if (status.BackendState === 'Running') {
        return NextResponse.json({
          success: true,
          message: 'Tailscale configured successfully',
          hostname: status.Self?.DNSName || status.Self?.HostName
        });
      } else {
        return NextResponse.json(
          { error: 'Failed to connect to Tailscale network' },
          { status: 500 }
        );
      }
    } catch (error) {
      console.error('Tailscale setup error:', error);

      // Verificar se o erro contém URL de login
      const errorMessage = error instanceof Error ? error.message : String(error);
      const loginUrlMatch = errorMessage.match(/https:\/\/login\.tailscale\.com\/[^\s]+/);

      if (loginUrlMatch) {
        return NextResponse.json({
          requiresLogin: true,
          loginUrl: loginUrlMatch[0],
          message: 'Please complete authentication in your browser'
        });
      }

      return NextResponse.json(
        { error: 'Failed to setup Tailscale with provided auth key' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Auth key setup error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}