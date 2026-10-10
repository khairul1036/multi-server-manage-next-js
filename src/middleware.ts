import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const cookieToken = request.cookies.get('token')?.value;
  const authHeader = request.headers.get('authorization');
  const bearerToken = authHeader?.startsWith('Bearer ') ? authHeader.substring(7) : null;
  const token = cookieToken || bearerToken;

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isPublicApi = pathname.startsWith('/api/auth');

  // Allow static files, next internal files, and public auth endpoints
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon.ico') ||
    pathname.startsWith('/public') ||
    isPublicApi
  ) {
    return NextResponse.next();
  }

  // If user has token and is trying to access login/register, redirect to dashboard
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  // If user does not have token and is trying to access protected pages/apis
  if (!isAuthPage && !token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Authentication required' },
        { status: 401 }
      );
    }
    const loginUrl = new URL('/login', request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
};
