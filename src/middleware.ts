import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const PUBLIC_ROUTES = ['/login', '/register', '/api/auth/login', '/api/auth/register', '/api/auth/refresh'];
  const API_ROUTES = ['/api']; 
  
  const path = request.nextUrl.pathname;
  
  
  if (path.includes('/_next') || 
      path.includes('/favicon.ico') ||
      path === '/') {
    return NextResponse.next();
  }
  
 
  if (API_ROUTES.some(route => path.startsWith(route))) {
    return NextResponse.next();
  }
  

  if (PUBLIC_ROUTES.includes(path) || 
      PUBLIC_ROUTES.some(route => path.startsWith(route))) {
    return NextResponse.next();
  }
  
  const tokenCookie = request.cookies.get('token');
  
  if (!tokenCookie || !tokenCookie.value) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', encodeURIComponent(request.nextUrl.pathname));
    return NextResponse.redirect(loginUrl);
  }
  
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
