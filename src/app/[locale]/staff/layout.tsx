'use client';

import { useState } from 'react';
import { useLocale } from 'next-intl';
import { usePathname, useRouter } from 'next/navigation';
import Link from 'next/link';
import { GuestDrawerProvider } from '@/contexts/GuestDrawerContext';
import { GuestDrawer } from '@/components/GuestDrawer';
import { useGuestDrawer } from '@/contexts/GuestDrawerContext';
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
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  group?: string;
}

function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { guestId, closeGuest } = useGuestDrawer();

  const ls = (en: string, es: string) => locale === 'es' ? es : en;

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push(`/${locale}/staff/login`);
    } catch {
      router.push(`/${locale}/staff/login`);
    }
  };

  const navigation: NavItem[] = [
    // Overview
    { name: ls('Dashboard', 'Panel'), href: `/${locale}/staff/dashboard`, icon: HomeIcon, group: ls('Overview', 'Vista General') },
    { name: ls('Reservations', 'Reservaciones'), href: `/${locale}/staff/reservations`, icon: CalendarDaysIcon, group: ls('Overview', 'Vista General') },
    { name: ls('Guests', 'Huéspedes'), href: `/${locale}/staff/guests`, icon: UsersIcon, group: ls('Overview', 'Vista General') },

    // Concierge Operations
    { name: ls('Transfers', 'Traslados'), href: `/${locale}/staff/transfers`, icon: TruckIcon, group: ls('Concierge', 'Concierge') },
    { name: ls('Tours & Activities', 'Tours y Actividades'), href: `/${locale}/staff/tour-bookings`, icon: MapIcon, group: ls('Concierge', 'Concierge') },
    { name: ls('Special Requests', 'Solicitudes'), href: `/${locale}/staff/special-requests`, icon: SparklesIcon, group: ls('Concierge', 'Concierge') },
    { name: ls('Hotel Bookings', 'Hoteles'), href: `/${locale}/staff/hotel-bookings`, icon: BuildingOfficeIcon, group: ls('Concierge', 'Concierge') },
    { name: ls('Romantic Dinners', 'Cenas Románticas'), href: `/${locale}/staff/romantic-dinners`, icon: HeartIcon, group: ls('Concierge', 'Concierge') },

    // F&B
    { name: ls('Orders', 'Órdenes'), href: `/${locale}/staff/orders`, icon: ShoppingCartIcon, group: ls('Food & Beverage', 'Alimentos') },

    // Communications
    { name: ls('Messages', 'Mensajes'), href: `/${locale}/staff/messages`, icon: ChatBubbleLeftRightIcon, group: ls('Communications', 'Comunicaciones') },

    // Admin
    { name: ls('Vendors', 'Vendedores'), href: `/${locale}/staff/vendors`, icon: UserGroupIcon, group: ls('Admin', 'Admin') },
    { name: ls('Tour Products', 'Productos de Tours'), href: `/${locale}/staff/tour-products`, icon: MapIcon, group: ls('Admin', 'Admin') },
    { name: ls('Settings', 'Configuración'), href: `/${locale}/staff/settings`, icon: Cog6ToothIcon, group: ls('Admin', 'Admin') },
  ];

  const groups = Array.from(new Set(navigation.map(n => n.group)));

  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  return (
    <div className="min-h-screen bg-gray-100">
      <GuestDrawer guestId={guestId} onClose={closeGuest} />
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={`fixed inset-y-0 left-0 z-50 w-64 bg-gray-900 flex flex-col transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Logo */}
        <div className="flex items-center justify-between h-16 px-6 bg-gray-800 flex-shrink-0">
          <div>
            <h1 className="text-base font-bold text-white leading-tight">Nayara BDT</h1>
            <p className="text-xs text-gray-400">Staff Portal</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden text-gray-400 hover:text-white">
            <XMarkIcon className="h-6 w-6" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {groups.map((group) => (
            <div key={group}>
              <p className="px-3 mb-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
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
                    className={`flex items-center px-3 py-2 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                      active
                        ? 'bg-blue-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                    }`}
                  >
                    <Icon className="h-5 w-5 mr-3 flex-shrink-0" />
                    {item.name}
                  </Link>
                );
              })}
            </div>
          ))}
        </nav>

        {/* Logout */}
        <div className="p-3 border-t border-gray-800 flex-shrink-0">
          <button
            onClick={handleLogout}
            className="flex items-center w-full px-3 py-2 text-gray-400 rounded-lg hover:bg-gray-800 hover:text-white transition-colors text-sm"
          >
            <ArrowRightOnRectangleIcon className="h-5 w-5 mr-3" />
            {ls('Sign Out', 'Cerrar Sesión')}
          </button>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        {/* Top header */}
        <header className="bg-white shadow-sm flex-shrink-0">
          <div className="flex items-center justify-between h-14 px-4">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden text-gray-500 hover:text-gray-700"
            >
              <Bars3Icon className="h-6 w-6" />
            </button>
            <div className="flex-1" />
            <div className="flex items-center gap-2">
              <button className="relative p-2 text-gray-500 hover:text-gray-700 rounded-lg hover:bg-gray-100">
                <BellIcon className="h-5 w-5" />
                <span className="absolute top-1.5 right-1.5 h-2 w-2 bg-red-500 rounded-full" />
              </button>
              <button className="flex items-center gap-2 px-3 py-1.5 text-gray-700 hover:bg-gray-100 rounded-lg">
                <UserCircleIcon className="h-6 w-6" />
                <span className="hidden sm:block text-sm font-medium">Staff</span>
              </button>
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
