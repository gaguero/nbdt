import { NextRequest, NextResponse } from 'next/server';
import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';
import { verifyTokenEdge, AUTH_COOKIE_NAME } from './lib/jwt-edge';

const intlMiddleware = createMiddleware(routing);

// ============================================================================
// PROTECTED ROUTE PATTERNS
// ============================================================================

const PROTECTED_STAFF_PATTERNS = [
  /^\/[^\/]+\/staff(?!\/login)/,
];

const PROTECTED_VENDOR_PATTERNS = [
  /^\/[^\/]+\/vendor\/(?!login)/,
];

const PROTECTED_KDS_PATTERNS = [
  /^\/[^\/]+\/kds/,
];

const PUBLIC_ROUTE_PATTERNS = [
  /^\/[^\/]+\/guest/,
  /^\/[^\/]+\/staff\/login/,
  /^\/[^\/]+\/vendor\/login/,
  /^\/_next/,
  /^\/api\/auth\/login/,
  /^\/api\/guest\//,
  /^\/api\/menu/,
  /^\/api\/channels/,
  /^\/api\/orders/,
  /^\/api\/tour-products/,
  /^\/api\/tour-schedules/,
  /^\/api\/tour-bookings/,
  /^\/api\/conversations/,
  /^\/api\/messages/,
  /^\/favicon\.ico/,
  /^\/.*\.(png|jpg|jpeg|gif|svg|ico|webp)$/,
];

function matchesPattern(pathname: string, patterns: RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(pathname));
}

function getLocaleFromPathname(pathname: string): string {
  const segments = pathname.split('/').filter(Boolean);
  const locale = segments[0];
  return routing.locales.includes(locale as any)
    ? locale
    : routing.defaultLocale;
}

function hasValidCookie(request: NextRequest, cookieName: string): boolean {
  return !!request.cookies.get(cookieName)?.value;
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================

export default async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (matchesPattern(pathname, PUBLIC_ROUTE_PATTERNS)) {
    return intlMiddleware(request);
  }

  const locale = getLocaleFromPathname(pathname);

  if (matchesPattern(pathname, PROTECTED_STAFF_PATTERNS)) {
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    let authenticated = false;
    if (token) {
      try { await verifyTokenEdge(token); authenticated = true; } catch {}
    }
    if (!authenticated) {
      const loginUrl = new URL(`/${locale}/staff/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (matchesPattern(pathname, PROTECTED_VENDOR_PATTERNS)) {
    const token = request.cookies.get('nayara_vendor_token')?.value;
    let authenticated = false;
    if (token) {
      try { await verifyTokenEdge(token); authenticated = true; } catch {}
    }
    if (!authenticated) {
      const loginUrl = new URL(`/${locale}/vendor/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  if (matchesPattern(pathname, PROTECTED_KDS_PATTERNS)) {
    const kdsToken = request.cookies.get('nayara_kds_token')?.value;
    const staffToken = request.cookies.get(AUTH_COOKIE_NAME)?.value;
    let authenticated = false;
    const token = kdsToken ?? staffToken;
    if (token) {
      try { await verifyTokenEdge(token); authenticated = true; } catch {}
    }
    if (!authenticated) {
      const loginUrl = new URL(`/${locale}/staff/login`, request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return intlMiddleware(request);
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\.html$).*)',
  ],
};
