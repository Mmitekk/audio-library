import { NextRequest, NextResponse } from 'next/server';

const COOKIE_NAME = 'admin_session';
const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;

function isAuthenticated(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;

  try {
    const decoded = JSON.parse(Buffer.from(cookieValue, 'base64').toString());
    if (decoded.exp && Date.now() > decoded.exp) return false;
    return !!decoded.login;
  } catch {
    return false;
  }
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /admin routes (except /admin/login)
  if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/login')) {
    const session = request.cookies.get(COOKIE_NAME);

    if (!isAuthenticated(session?.value)) {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/admin/:path*'],
};
