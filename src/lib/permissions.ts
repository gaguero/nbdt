export const PERMISSIONS = {
  // --- Guests ---
  'guests:read': 'guests:read',
  'guests:create': 'guests:create',
  'guests:update': 'guests:update',
  'guests:delete': 'guests:delete',
  'guests:merge': 'guests:merge',

  // --- Reservations ---
  'reservations:read': 'reservations:read',
  'reservations:import': 'reservations:import',
  'reservations:manage': 'reservations:manage', // check-in/out, etc.

  // --- Transfers ---
  'transfers:read': 'transfers:read',
  'transfers:create': 'transfers:create',
  'transfers:update': 'transfers:update',
  'transfers:delete': 'transfers:delete',
  'transfers:assign': 'transfers:assign', // assign vendor/driver

  // --- Tours ---
  'tours:read': 'tours:read',
  'tours:create': 'tours:create',
  'tours:update': 'tours:update',
  'tours:delete': 'tours:delete',
  'tours:products:manage': 'tours:products:manage', // manage products/prices

  // --- Orders (F&B) ---
  'orders:read': 'orders:read',
  'orders:create': 'orders:create',
  'orders:update': 'orders:update',
  'orders:void': 'orders:void',
  'menu:manage': 'menu:manage',

  // --- Staff & Admin ---
  'staff:read': 'staff:read',
  'staff:manage': 'staff:manage',
  'roles:manage': 'roles:manage',
  'settings:manage': 'settings:manage',
  
  // --- Reports ---
  'reports:view': 'reports:view',

  // --- Email ---
  'email:read': 'email:read',
  'email:read_all': 'email:read_all',
  'email:send': 'email:send',
  'email:manage': 'email:manage',
  'email:admin': 'email:admin',

  // --- Fleet ---
  'fleet:read': 'fleet:read',
  'fleet:manage': 'fleet:manage',
  'fleet:assign': 'fleet:assign',
  'boats:read': 'boats:read',
  'boats:manage': 'boats:manage',
  'captain:view_own': 'captain:view_own',
  'captain:update_status': 'captain:update_status',
} as const;

export type Permission = keyof typeof PERMISSIONS;
