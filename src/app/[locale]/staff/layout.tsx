'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GuestDrawerProvider } from '@/contexts/GuestDrawerContext';
import { GuestDrawer } from '@/components/GuestDrawer';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
import { usePermissions } from '@/hooks/usePermissions';
import { Permission } from '@/lib/permissions';
import {
  HomeIcon,
  CalendarDaysIcon,
  UsersIcon,
  TruckIcon,
  MapIcon,
  SparklesIcon,
  BuildingOfficeIcon,
  HeartIcon,
  ClipboardDocumentListIcon,
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  XMarkIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  PrinterIcon,
  CloudArrowUpIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  group?: string;
  permission?: Permission;
}

function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { guestId, closeGuest } = useGuestDrawer();
  const { can } = usePermissions();

  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push(`/${locale}/staff/login`);
    } catch {
      router.push(`/${locale}/staff/login`);
    }
  };

  const allNavigation: NavItem[] = [
    // Overview
    { name: ls('Dashboard', 'Panel'), href: `/dashboard.html`, icon: HomeIcon, group: ls('Overview', 'Vista General') },
    { name: ls('My Profile', 'Mi Perfil'), href: `/${locale}/staff/profiles/me`, icon: UserCircleIcon, group: ls('Overview', 'Vista General') },
    { name: ls('Reservations', 'Reservaciones'), href: `/${locale}/staff/reservations`, icon: CalendarDaysIcon, group: ls('Overview', 'Vista General'), permission: 'reservations:read' },
    { name: ls('Guests', 'Huéspedes'), href: `/${locale}/staff/guests`, icon: UsersIcon, group: ls('Overview', 'Vista General'), permission: 'guests:read' },
    { name: ls('Profiles', 'Perfiles'), href: `/${locale}/staff/profiles`, icon: UserGroupIcon, group: ls('Overview', 'Vista General'), permission: 'guests:read' },

    // Concierge Operations
    { name: ls('Transfers', 'Traslados'), href: `/${locale}/staff/transfers`, icon: TruckIcon, group: ls('Concierge', 'Concierge'), permission: 'transfers:read' },
    { name: ls('Tours & Activities', 'Tours y Actividades'), href: `/${locale}/staff/tour-bookings`, icon: MapIcon, group: ls('Concierge', 'Concierge'), permission: 'tours:read' },
    { name: ls('Special Requests', 'Solicitudes'), href: `/${locale}/staff/special-requests`, icon: SparklesIcon, group: ls('Concierge', 'Concierge'), permission: 'reservations:manage' },
    { name: ls('Hotel Bookings', 'Hoteles'), href: `/${locale}/staff/hotel-bookings`, icon: BuildingOfficeIcon, group: ls('Concierge', 'Concierge'), permission: 'reservations:manage' },
    { name: ls('Romantic Dinners', 'Cenas Románticas'), href: `/${locale}/staff/romantic-dinners`, icon: HeartIcon, group: ls('Concierge', 'Concierge'), permission: 'reservations:manage' },
    { name: ls('Billing', 'Facturación'), href: `/${locale}/staff/billing`, icon: CurrencyDollarIcon, group: ls('Concierge', 'Concierge'), permission: 'reservations:manage' },
    { name: ls('Daily Sheet', 'Hoja Diaria'), href: `/${locale}/staff/daily-sheet`, icon: PrinterIcon, group: ls('Concierge', 'Concierge'), permission: 'reports:view' },

    // F&B
    { name: ls('Orders', 'Órdenes'), href: `/${locale}/staff/orders`, icon: ShoppingCartIcon, group: ls('Food & Beverage', 'Alimentos'), permission: 'orders:read' },

    // Communications
    { name: ls('Messages', 'Mensajes'), href: `/${locale}/staff/messages`, icon: ChatBubbleLeftRightIcon, group: ls('Communications', 'Comunicaciones') },

    // Admin
    { name: ls('User Management', 'Gestión de Usuarios'), href: `/${locale}/staff/users`, icon: UsersIcon, group: ls('Admin', 'Admin'), permission: 'staff:manage' },
    { name: ls('Vendors', 'Vendedores'), href: `/${locale}/staff/vendors`, icon: UserGroupIcon, group: ls('Admin', 'Admin'), permission: 'settings:manage' },
    { name: ls('Vendor Import', 'Importar Vendedores'), href: `/${locale}/staff/vendor-import-wizard`, icon: CloudArrowUpIcon, group: ls('Admin', 'Admin'), permission: 'settings:manage' },
    { name: ls('Tour Products', 'Productos de Tours'), href: `/${locale}/staff/tour-products`, icon: MapIcon, group: ls('Admin', 'Admin'), permission: 'tours:products:manage' },
    { name: ls('Data Curation Center', 'Centro de Curacion de Datos'), href: `/${locale}/staff/settings`, icon: Cog6ToothIcon, group: ls('Admin', 'Admin'), permission: 'settings:manage' },
  ];

  const navigation = allNavigation.filter(item => !item.permission || can(item.permission));
  const groups = Array.from(new Set(navigation.map(n => n.group)));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <GuestDrawer guestId={guestId} onClose={closeGuest} />

      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(14,26,9,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 flex flex-col transform transition-transform duration-300 ease-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
        style={{ background: 'var(--sidebar-bg)' }}
      >
        {/* Logo */}
        <div
          className="flex items-center justify-between h-16 px-5 flex-shrink-0"
          style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}
        >
          <div>
            <h1
              className="text-sm font-bold italic leading-tight"
              style={{ fontFamily: "'Playfair Display', serif", color: 'var(--gold)' }}
            >
              Nayara BDT
            </h1>
            <p className="text-[10px] font-medium tracking-[0.1em] uppercase" style={{ color: 'rgba(255,255,255,0.35)' }}>
              Staff Portal
            </p>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1.5 rounded-lg transition-opacity opacity-60 hover:opacity-100"
            style={{ color: 'rgba(255,255,255,0.6)' }}
          >
            <XMarkIcon className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-5 overflow-y-auto custom-scrollbar">
          {groups.map((group) => (
            <div key={group}>
              <p
                className="px-2 mb-1.5 text-[10px] font-bold uppercase tracking-[0.12em]"
                style={{ color: 'rgba(255,255,255,0.28)' }}
              >
                {group}
              </p>
              {navigation.filter(n => n.group === group).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setSidebarOpen(false)}
                    className="flex items-center px-3 py-2 rounded-lg text-sm font-medium mb-0.5 transition-colors"
                    style={
                      active
                        ? { background: 'var(--gold)', color: '#fff' }
                        : { color: 'rgba(255,255,255,0.55)' }
                    }
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.07)';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.9)';
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
                      }
                    }}
                  >
                    <Icon className="h-4 w-4 mr-3 flex-shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 flex-shrink-0" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 rounded-lg text-sm font-medium transition-colors"
            style={{ color: 'rgba(255,255,255,0.40)' }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'rgba(236,108,75,0.12)';
              e.currentTarget.style.color = '#EC6C4B';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.color = 'rgba(255,255,255,0.40)';
            }}
          >
            <ArrowRightOnRectangleIcon className="h-4 w-4 mr-3" />
            {ls('Sign Out', 'Cerrar Sesión')}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top header */}
        <header
          className="flex-shrink-0"
          style={{
            background: 'var(--surface)',
            borderBottom: '1px solid var(--separator)',
            boxShadow: '0 1px 4px rgba(78,94,62,0.08)',
          }}
        >
          <div className="flex items-center justify-between h-14 px-5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden p-1.5 rounded-lg transition-colors"
              style={{ color: 'var(--muted-dim)' }}
            >
              <Bars3Icon className="h-5 w-5" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button
                className="relative p-2 rounded-lg transition-colors"
                style={{ color: 'var(--muted-dim)' }}
                onMouseEnter={e => {
                  e.currentTarget.style.background = 'var(--elevated)';
                  e.currentTarget.style.color = 'var(--charcoal)';
                }}
                onMouseLeave={e => {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = 'var(--muted-dim)';
                }}
              >
                <BellIcon className="h-5 w-5" />
                <span
                  className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full"
                  style={{ background: 'var(--terra)' }}
                />
              </button>
              <Link
                href={`/${locale}/staff/profiles/me`}
                className="flex items-center gap-2 px-3 py-1.5 rounded-lg transition-colors"
                style={{ color: 'var(--muted)' }}
                onMouseEnter={e => (e.currentTarget.style.background = 'var(--elevated)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
              >
                <UserCircleIcon className="h-5 w-5" style={{ color: 'var(--sage)' }} />
                <span className="hidden sm:block text-sm font-medium">Staff</span>
              </Link>
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestDrawerProvider>
      <StaffLayoutContent>{children}</StaffLayoutContent>
    </GuestDrawerProvider>
  );
}
