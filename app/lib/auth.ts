import { cookies } from 'next/headers';
import { NextRequest } from 'next/server';

const AUTH_COOKIE_NAME = 'funnel-manager-auth';
const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24 horas

// Obter credenciais das variáveis de ambiente
function getAuthCredentials() {
  return {
    username: process.env.AUTH_USERNAME || 'admin',
    password: process.env.AUTH_PASSWORD || 'changeme',
    enabled: process.env.AUTH_ENABLED === 'true'
  };
}

// Verificar se autenticação está habilitada
export function isAuthEnabled(): boolean {
  const { enabled } = getAuthCredentials();
  return enabled;
}

// Validar credenciais
export function validateCredentials(username: string, password: string): boolean {
  const { username: validUsername, password: validPassword } = getAuthCredentials();
  return username === validUsername && password === validPassword;
}

// Criar token de sessão simples (em produção, use JWT ou similar)
export function createSessionToken(username: string): string {
  const timestamp = Date.now();
  const data = `${username}:${timestamp}`;
  return Buffer.from(data).toString('base64');
}

// Verificar token de sessão
export function verifySessionToken(token: string): { valid: boolean; username?: string } {
  try {
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [username, timestamp] = decoded.split(':');
    const tokenAge = Date.now() - parseInt(timestamp);

    if (tokenAge > SESSION_DURATION) {
      return { valid: false };
    }

    return { valid: true, username };
  } catch {
    return { valid: false };
  }
}

// Verificar se usuário está autenticado
export async function isAuthenticated(request: NextRequest): Promise<boolean> {
  // Se autenticação não está habilitada, permitir acesso
  if (!isAuthEnabled()) {
    return true;
  }

  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return false;
  }

  const { valid } = verifySessionToken(token);
  return valid;
}

// Obter usuário da sessão
export async function getSessionUser(request: NextRequest): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  const { valid, username } = verifySessionToken(token);
  return valid ? username || null : null;
}

// Criar cookie de sessão
export function createSessionCookie(username: string) {
  const token = createSessionToken(username);
  return {
    name: AUTH_COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: SESSION_DURATION / 1000, // em segundos
    path: '/'
  };
}

// Limpar cookie de sessão
export function clearSessionCookie() {
  return {
    name: AUTH_COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    maxAge: 0,
    path: '/'
  };
}
