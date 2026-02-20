'use client';

import { useAuth } from './useAuth';
import { Permission } from '@/lib/permissions';

export function usePermissions() {
  const { user, loading } = useAuth();

  /**
   * Check if the current user has a specific permission.
   * Admins always return true.
   */
  const can = (permission: Permission): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return user.permissions.includes(permission);
  };

  /**
   * Check if the current user has ANY of the provided permissions.
   */
  const canAny = (permissions: Permission[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissions.some(p => user.permissions.includes(p));
  };

  /**
   * Check if the current user has ALL of the provided permissions.
   */
  const canAll = (permissions: Permission[]): boolean => {
    if (!user) return false;
    if (user.role === 'admin') return true;
    return permissions.every(p => user.permissions.includes(p));
  };

  return {
    can,
    canAny,
    canAll,
    loading,
    role: user?.role,
    is: (role: string) => user?.role === role,
  };
}
