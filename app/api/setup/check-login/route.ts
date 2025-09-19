import { NextRequest, NextResponse } from 'next/server';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

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

    // Tentar fazer `tailscale up` sem auth key para obter URL de login
    try {
      const { stdout, stderr } = await execAsync('tailscale up --accept-routes --accept-dns');

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

      // Se não há URL, verificar status atual
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
        // Ignore status check errors
      }

      return NextResponse.json({
        success: false,
        message: 'Unable to determine login URL'
      });

    } catch (error) {
      console.error('Tailscale up error:', error);

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

      // Tentar obter URL através do `tailscale login`
      try {
        const { stdout: loginOutput, stderr: loginStderr } = await execAsync('tailscale login');
        const loginOutput2 = loginOutput + loginStderr;
        const loginUrlMatch2 = loginOutput2.match(/https:\/\/login\.tailscale\.com\/[^\s]+/);

        if (loginUrlMatch2) {
          return NextResponse.json({
            requiresLogin: true,
            loginUrl: loginUrlMatch2[0],
            message: 'Please complete authentication in your browser'
          });
        }
      } catch (loginError) {
        console.error('Tailscale login error:', loginError);

        const loginErrorMessage = loginError instanceof Error ? loginError.message : String(loginError);
        const loginUrlMatch3 = loginErrorMessage.match(/https:\/\/login\.tailscale\.com\/[^\s]+/);

        if (loginUrlMatch3) {
          return NextResponse.json({
            requiresLogin: true,
            loginUrl: loginUrlMatch3[0],
            message: 'Please complete authentication in your browser'
          });
        }
      }

      return NextResponse.json(
        { error: 'Failed to get login URL' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Check login error:', error);
    return NextResponse.json(
      { error: 'Invalid request' },
      { status: 400 }
    );
  }
}