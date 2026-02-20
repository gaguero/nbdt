import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { getRolePermissions } from './roles';
import { Permission } from './permissions';

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  propertyId: string;
  permissions: Permission[];
  isActive: boolean;
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  propertyId: string;
  // Permissions are not typically stored in the token to keep it small and allow immediate revocation/changes,
  // but for statelessness we can compute them on verify or verify against DB.
  // Here, verifyToken will return an EnhancedTokenPayload that includes permissions.
}

export interface EnhancedTokenPayload extends TokenPayload {
  permissions: Permission[];
}

// ============================================================================
// JWT TOKEN MANAGEMENT
// ============================================================================

/**
 * Generates a JWT token for authenticated users
 * @param userId - User's unique identifier
 * @param email - User's email address
 * @param role - User's role in the system
 * @param propertyId - Property the user belongs to
 * @returns Signed JWT token string
 */
export function generateToken(
  userId: string,
  email: string,
  role: string,
  propertyId: string
): string {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  const expiresIn = (process.env.JWT_EXPIRES_IN || '7d') as `${number}${'s' | 'm' | 'h' | 'd' | 'w' | 'y'}`;

  const payload: TokenPayload = {
    userId,
    email,
    role,
    propertyId,
  };

  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verifies and decodes a JWT token, and augments it with permissions based on Role.
 * @param token - JWT token string to verify
 * @returns Decoded token payload with Permissions
 * @throws Error if token is invalid or expired
 */
export function verifyToken(token: string): EnhancedTokenPayload {
  const secret = process.env.JWT_SECRET;

  if (!secret) {
    throw new Error('JWT_SECRET is not defined in environment variables');
  }

  try {
    const decoded = jwt.verify(token, secret) as TokenPayload;
    
    // Compute permissions based on Role (and later, custom DB permissions)
    const permissions = getRolePermissions(decoded.role);

    return {
      ...decoded,
      permissions
    };
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    }
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token expired');
    }
    throw new Error('Token verification failed');
  }
}

// ============================================================================
// PASSWORD HASHING
// ============================================================================

const SALT_ROUNDS = 10;

/**
 * Hashes a password using bcrypt
 * @param password - Plain text password to hash
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length < 8) {
    throw new Error('Password must be at least 8 characters long');
  }

  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compares a plain text password with a hashed password
 * @param password - Plain text password to check
 * @param hash - Hashed password to compare against
 * @returns True if passwords match, false otherwise
 */
export async function comparePassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false;
  }

  return await bcrypt.compare(password, hash);
}

// ============================================================================
// COOKIE MANAGEMENT
// ============================================================================

export const AUTH_COOKIE_NAME = 'nayara_auth_token';

export const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: 60 * 60 * 24 * 7, // 7 days in seconds
  path: '/',
};
