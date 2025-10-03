import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/app/lib/auth';

export async function POST() {
  const cookie = clearSessionCookie();
  const response = NextResponse.json({ success: true });
  response.cookies.set(cookie);
  return response;
}
