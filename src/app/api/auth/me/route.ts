import { NextRequest, NextResponse } from 'next/server';
import { queryOne } from '@/lib/db';
import { verifyToken, AUTH_COOKIE_NAME } from '@/lib/auth';
import { getRolePermissions } from '@/lib/roles';

// ============================================================================
// TYPES
// ============================================================================

interface StaffUserRow {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  role: string;
  property_id: string;
  permissions: string[];
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
}

// ============================================================================
// GET CURRENT USER HANDLER
// ============================================================================

export async function GET(request: NextRequest) {
  try {
    // Get token from cookie
    const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      return NextResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Verify and decode token
    let tokenPayload;
    try {
      tokenPayload = verifyToken(token);
    } catch (error) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Fetch current user data from database
    const user = await queryOne<StaffUserRow>(
      `SELECT
        id,
        email,
        first_name,
        last_name,
        role,
        property_id,
        permissions,
        is_active,
        last_login_at,
        created_at
      FROM staff_users
      WHERE id = $1`,
      [tokenPayload.userId]
    );

    // Check if user exists
    if (!user) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 }
      );
    }

    // Check if user is still active
    if (!user.is_active) {
      return NextResponse.json(
        { error: 'Account is deactivated' },
        { status: 403 }
      );
    }

    // Compute effective permissions: Role Defaults + DB Custom Permissions
    const rolePermissions = getRolePermissions(user.role);
    const dbPermissions = user.permissions || [];
    const effectivePermissions = Array.from(new Set([...rolePermissions, ...dbPermissions]));

    // Prepare user data response
    const userData = {
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      fullName: `${user.first_name} ${user.last_name}`,
      role: user.role,
      propertyId: user.property_id,
      permissions: effectivePermissions,
      isActive: user.is_active,
      lastLoginAt: user.last_login_at,
      createdAt: user.created_at,
    };

    return NextResponse.json(
      { user: userData },
      { status: 200 }
    );
  } catch (error) {
    console.error('Get current user error:', error);

    return NextResponse.json(
      { error: 'An error occurred while fetching user data' },
      { status: 500 }
    );
  }
}

// ============================================================================
// METHOD NOT ALLOWED HANDLER
// ============================================================================

export async function POST() {
  return NextResponse.json(
    { error: 'Method not allowed' },
    { status: 405 }
  );
}
