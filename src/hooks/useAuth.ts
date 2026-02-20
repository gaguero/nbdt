'use client';

import { useState, useEffect } from 'react';

// ============================================================================
// TYPES
// ============================================================================

export interface AuthUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: string;
  propertyId: string;
  permissions: string[];
  isActive: boolean;
  lastLoginAt: string | null;
  createdAt: string;
  station: string | null;
}

interface UseAuthReturn {
  user: AuthUser | null;
  loading: boolean;
  error: string | null;
  isAuthenticated: boolean;
  refetch: () => Promise<void>;
}

// ============================================================================
// CUSTOM HOOK: useAuth
// ============================================================================

/**
 * Custom hook to manage authentication state
 * Fetches current user data from /api/auth/me
 *
 * @returns {UseAuthReturn} Authentication state and methods
 */
export function useAuth(): UseAuthReturn {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/me', {
        method: 'GET',
        credentials: 'include', // Include cookies
      });

      if (!response.ok) {
        if (response.status === 401) {
          // Not authenticated - this is expected for logged-out users
          setUser(null);
          return;
        }

        const data = await response.json();
        throw new Error(data.error || 'Failed to fetch user');
      }

      const data = await response.json();
      setUser(data.user);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);

  return {
    user,
    loading,
    error,
    isAuthenticated: user !== null,
    refetch: fetchUser,
  };
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Checks if user has a specific permission
 * @param user - Current authenticated user
 * @param permission - Permission string to check
 * @returns True if user has the permission
 */
export function hasPermission(user: AuthUser | null, permission: string): boolean {
  if (!user) return false;
  return user.permissions.includes(permission);
}

/**
 * Checks if user has a specific role
 * @param user - Current authenticated user
 * @param role - Role to check
 * @returns True if user has the role
 */
export function hasRole(
  user: AuthUser | null,
  role: string
): boolean {
  if (!user) return false;
  return user.role === role;
}

/**
 * Checks if user has any of the specified roles
 * @param user - Current authenticated user
 * @param roles - Array of roles to check
 * @returns True if user has any of the roles
 */
export function hasAnyRole(
  user: AuthUser | null,
  roles: string[]
): boolean {
  if (!user) return false;
  return roles.includes(user.role);
}
