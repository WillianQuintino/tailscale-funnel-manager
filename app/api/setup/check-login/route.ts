import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

// Função helper para executar comando com timeout
async function execWithTimeout(command: string, timeoutMs: number = 5000): Promise<{ stdout: string; stderr: string }> {
  return new Promise((resolve, reject) => {
    const child = exec(command, { timeout: timeoutMs }, (error, stdout, stderr) => {
      // Mesmo com timeout/erro, podemos ter output útil
      if (stdout || stderr) {
        resolve({ stdout, stderr });
      } else if (error) {
        reject(error);
      } else {
        resolve({ stdout: '', stderr: '' });
      }
    });

    // Garantir que o processo seja morto após o timeout
    setTimeout(() => {
      child.kill('SIGTERM');
    }, timeoutMs);
  });
}

export async function POST(_request: NextRequest) {
  try {
    // Verificar se Tailscale está instalado
    try {
      await execAsync('tailscale version');
    } catch {
      return NextResponse.json(
        { error: 'Tailscale not installed or not in PATH' },
        { status: 500 }
      );
    }

    // Primeiro verificar se já está autenticado
    try {
      const { stdout: statusOutput } = await execAsync('tailscale status --json');
      const status = JSON.parse(statusOutput);

      if (status.BackendState === 'Running') {
        return NextResponse.json({
          success: true,
          message: 'Tailscale is already configured',
          hostname: status.Self?.DNSName || status.Self?.HostName
        });
      }
    } catch {
      // Não está autenticado, continuar
    }

    // Tentar obter URL de login com timeout
    try {
      const { stdout, stderr } = await execWithTimeout('tailscale up --accept-routes --accept-dns 2>&1', 3000);

      const output = stdout + stderr;
      const loginUrlMatch = output.match(/https:\/\/login\.tailscale\.com\/a\/[a-zA-Z0-9]+/);

      if (loginUrlMatch) {
        return NextResponse.json({
          requiresLogin: true,
          loginUrl: loginUrlMatch[0],
          message: 'Please complete authentication in your browser'
        });
      }
    } catch (error: unknown) {
      // Capturar URL do erro (comando pode ter dado timeout mas gerado URL)
      const execError = error as { stdout?: string; stderr?: string; message?: string };
      const output = (execError.stdout || '') + (execError.stderr || '') + (execError.message || '');
      const loginUrlMatch = output.match(/https:\/\/login\.tailscale\.com\/a\/[a-zA-Z0-9]+/);

      if (loginUrlMatch) {
        return NextResponse.json({
          requiresLogin: true,
          loginUrl: loginUrlMatch[0],
          message: 'Please complete authentication in your browser'
        });
      }
    }

    return NextResponse.json(
      { error: 'Failed to get login URL. Please check Tailscale logs.' },
      { status: 500 }
    );
  } catch (error) {
    console.error('Check login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}