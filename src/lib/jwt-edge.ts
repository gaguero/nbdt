/**
 * Edge-runtime compatible JWT verification using `jose`.
 * Used by middleware.ts only.
 * API routes use the full auth.ts (Node.js runtime).
 */
import { jwtVerify } from 'jose';

export const AUTH_COOKIE_NAME = 'nayara_auth_token';

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  propertyId: string;
}

function getSecret(): Uint8Array {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error('JWT_SECRET not set');
  return new TextEncoder().encode(secret);
}

export async function verifyTokenEdge(token: string): Promise<TokenPayload> {
  const { payload } = await jwtVerify(token, getSecret());
  return payload as unknown as TokenPayload;
}
