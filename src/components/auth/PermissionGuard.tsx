'use client';

import React from 'react';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/permissions';

interface PermissionGuardProps {
  permission?: Permission;
  permissions?: Permission[];
  requireAll?: boolean;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * A wrapper component that only renders its children if the user has the required permissions.
 * 
 * Usage:
 * <PermissionGuard permission="guests:delete">
 *   <DeleteButton />
 * </PermissionGuard>
 */
export function PermissionGuard({ 
  permission, 
  permissions, 
  requireAll = false, 
  children, 
  fallback = null 
}: PermissionGuardProps) {
  const { can, canAny, canAll, loading } = usePermissions();

  if (loading) return null; // Or a skeleton if critical

  let hasAccess = false;

  if (permission) {
    hasAccess = can(permission);
  } else if (permissions) {
    hasAccess = requireAll ? canAll(permissions) : canAny(permissions);
  } else {
    // If no permission specified, assume open (or could default to false)
    hasAccess = true;
  }

  return hasAccess ? <>{children}</> : <>{fallback}</>;
}
