import { Permission, PERMISSIONS } from './permissions';

const P = PERMISSIONS;

export const ROLES_CONFIG: Record<string, { label: string, permissions: Permission[] }> = {
  admin: {
    label: 'Admin',
    permissions: Object.values(P) as Permission[] // All permissions
  },
  manager: {
    label: 'Manager',
    permissions: [
      P['guests:read'], P['guests:create'], P['guests:update'],
      P['reservations:read'], P['reservations:import'], P['reservations:manage'],
      P['transfers:read'], P['transfers:create'], P['transfers:update'], P['transfers:delete'],
      P['tours:read'], P['tours:create'], P['tours:update'], P['tours:delete'],
      P['orders:read'], P['orders:create'], P['orders:update'], P['orders:void'],
      P['staff:read'], P['staff:manage'],
      P['reports:view'],
      P['menu:manage']
    ]
  },
  front_desk: {
    label: 'Front Desk',
    permissions: [
      P['guests:read'], P['guests:create'], P['guests:update'],
      P['reservations:read'], P['reservations:manage'],
      P['transfers:read'], P['transfers:create'], P['transfers:update'],
      P['tours:read'], P['tours:create'],
      P['orders:read']
    ]
  },
  concierge: {
    label: 'Concierge',
    permissions: [
      P['guests:read'], P['guests:create'], P['guests:update'],
      P['reservations:read'],
      P['transfers:read'], P['transfers:create'], P['transfers:update'],
      P['tours:read'], P['tours:create'], P['tours:update'],
      P['orders:read'], P['orders:create']
    ]
  },
  kitchen: {
    label: 'Kitchen',
    permissions: [
      P['orders:read'], P['orders:update'] // View KDS, bump orders
    ]
  },
  bar: {
    label: 'Bar',
    permissions: [
      P['orders:read'], P['orders:update'], P['orders:create']
    ]
  },
  waiter: {
    label: 'Waiter',
    permissions: [
      P['orders:read'], P['orders:create'], P['orders:update']
    ]
  },
  logistics: {
    label: 'Logistics Manager',
    permissions: [
      P['transfers:read'], P['transfers:create'], P['transfers:update'], P['transfers:assign'],
      P['tours:read']
    ]
  },
  captain: {
    label: 'Boat Captain',
    permissions: [
      P['transfers:read'] // Typically limited to assigned, handled by logic
    ]
  },
  housekeeping: {
    label: 'Housekeeping',
    permissions: [
      P['reservations:read'] // View occupancy
    ]
  },
  maintenance: {
    label: 'Maintenance',
    permissions: [
      // Future: P['tasks:read'], P['tasks:update']
    ]
  }
};

export function getRolePermissions(role: string): Permission[] {
  return ROLES_CONFIG[role]?.permissions || [];
}
