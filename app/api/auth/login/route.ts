import { NextRequest, NextResponse } from 'next/server';
import { validateCredentials, createSessionCookie, isAuthEnabled } from '@/app/lib/auth';

export async function POST(request: NextRequest) {
  try {
    // Se autenticação não está habilitada, retornar erro
    if (!isAuthEnabled()) {
      return NextResponse.json(
        { error: 'Authentication is not enabled' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return NextResponse.json(
        { error: 'Username and password are required' },
        { status: 400 }
      );
    }

    // Validar credenciais
    if (!validateCredentials(username, password)) {
      return NextResponse.json(
        { error: 'Invalid username or password' },
        { status: 401 }
      );
    }

    // Criar sessão
    const cookie = createSessionCookie(username);
    const response = NextResponse.json({
      success: true,
      username
    });

    response.cookies.set(cookie);

    return response;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
