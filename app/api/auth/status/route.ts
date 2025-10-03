import { NextRequest, NextResponse } from 'next/server';
import { isAuthenticated, getSessionUser, isAuthEnabled } from '@/app/lib/auth';

export async function GET(request: NextRequest) {
  const authEnabled = isAuthEnabled();

  if (!authEnabled) {
    return NextResponse.json({
      authEnabled: false,
      authenticated: true,
      username: null
    });
  }

  const authenticated = await isAuthenticated(request);
  const username = authenticated ? await getSessionUser(request) : null;

  return NextResponse.json({
    authEnabled,
    authenticated,
    username
  });
}
