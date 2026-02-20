import { NextRequest, NextResponse } from 'next/server';
import { verifyToken, AUTH_COOKIE_NAME } from './auth';
import { Permission } from './permissions';

/**
 * Verifies that the current request is authenticated and has the required permission.
 * Throws an error if not authorized, which should be caught by the route handler.
 * 
 * @param request - The incoming NextRequest
 * @param requiredPermission - The specific permission string to check
 * @returns The decoded user payload if successful
 */
export async function checkPermission(request: NextRequest, requiredPermission: Permission) {
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

  if (!token) {
    throw new Error('Unauthorized: No token provided');
  }

  const payload = verifyToken(token); // This now includes computed permissions

  if (payload.role === 'admin') return payload; // Admins override all

  if (!payload.permissions.includes(requiredPermission)) {
    throw new Error(`Forbidden: Missing permission ${requiredPermission}`);
  }

  return payload;
}

/**
 * Middleware-like wrapper for API routes to enforce permissions.
 * Usage: 
 *   const authResult = await protectRoute(req, 'guests:read');
 *   if (authResult instanceof NextResponse) return authResult;
 *   const user = authResult;
 */
export async function protectRoute(request: NextRequest, permission: Permission) {
  try {
    return await checkPermission(request, permission);
  } catch (error: any) {
    const status = error.message.includes('Unauthorized') ? 401 : 403;
    return NextResponse.json({ error: error.message }, { status });
  }
}
