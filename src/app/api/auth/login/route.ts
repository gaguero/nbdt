import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import {
  generateToken,
  comparePassword,
  AUTH_COOKIE_NAME,
  COOKIE_OPTIONS
} from '@/lib/auth';
import { z } from 'zod';

// ============================================================================
// VALIDATION SCHEMA
// ============================================================================

const loginSchema = z.object({
  email: z.string().email('Invalid email format'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

// ============================================================================
// TYPES
// ============================================================================

interface StaffUserRow {
  id: string;
  email: string;
  password_hash: string;
  first_name: string;
  last_name: string;
  role: 'admin' | 'manager' | 'staff' | 'kitchen' | 'front_desk';
  property_id: string;
  permissions: string[];
  is_active: boolean;
}

// ============================================================================
// LOGIN HANDLER
// ============================================================================

export async function POST(request: NextRequest) {
  try {
    // Parse and validate request body
    const body = await request.json();
    const validationResult = loginSchema.safeParse(body);

    if (!validationResult.success) {
      return NextResponse.json(
        {
          error: 'Validation failed',
          details: validationResult.error.errors
        },
        { status: 400 }
      );
    }

    const { email, password } = validationResult.data;

    // Find user by email
    const user = await queryOne<StaffUserRow>(
      `SELECT
        id,
        email,
        password_hash,
        first_name,
        last_name,
        role,
        property_id,
        permissions,
        is_active
      FROM staff_users
      WHERE email = $1`,
      [email.toLowerCase()]
    );

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Check if user is active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated. Please contact administrator.' },
        { status: 403 }
      );
    }

    // Verify password
    const isPasswordValid = await comparePassword(password, user.password_hash);

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // Update last login timestamp
    await queryOne(
      `UPDATE staff_users
       SET last_login_at = NOW()
       WHERE id = $1`,
      [user.id]
    );

    // Generate JWT token
    const token = generateToken(
      user.id,
      user.email,
      user.role,
      user.property_id
    );

    // Prepare user data (excluding password)
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      role: user.role,
      propertyId: user.property_id,
      permissions: user.permissions,
      isActive: user.is_active,
    };

    // Create response with user data
    const response = NextResponse.json(
      {
        message: 'Login successful',
        user: userData,
      },
      { status: 200 }
    );

    // Set httpOnly cookie with JWT token
    response.cookies.set(AUTH_COOKIE_NAME, token, COOKIE_OPTIONS);

    return response;
  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { error: 'An error occurred during login. Please try again.' },
      { status: 500 }
    );
  }
}

// ============================================================================
// METHOD NOT ALLOWED HANDLER
// ============================================================================

export async function GET() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
