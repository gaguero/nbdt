'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
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
  ChatBubbleLeftRightIcon,
  UserGroupIcon,
  Cog6ToothIcon,
  ArrowRightOnRectangleIcon,
  BellIcon,
  UserCircleIcon,
  Bars3Icon,
  ChevronLeftIcon,
  ShoppingCartIcon,
  CurrencyDollarIcon,
  PrinterIcon,
  CircleStackIcon,
  EnvelopeIcon,
  IdentificationIcon,
} from '@heroicons/react/24/outline';

interface NavItem {
  name: string;
  href: string;
  icon: React.ElementType;
  permission?: Permission;
}

interface NavGroup {
  key: string;
  label: string;
  icon: React.ElementType;
  items: NavItem[];
  permission?: Permission;
}

const RAIL_WIDTH = 72;
const PANEL_WIDTH = 210;

function StaffLayoutContent({ children }: { children: React.ReactNode }) {
  const locale = useLocale();
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [panelOpen, setPanelOpen] = useState(true);
  const [activeGroup, setActiveGroup] = useState<string | null>(null);
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const allGroups: NavGroup[] = [
    {
      key: 'concierge',
      label: ls('Concierge', 'Concierge'),
      icon: CalendarDaysIcon,
      items: [
        { name: ls('Reservations', 'Reservaciones'), href: `/${locale}/staff/reservations`, icon: CalendarDaysIcon, permission: 'reservations:read' },
        { name: ls('Guests', 'Huéspedes'), href: `/${locale}/staff/guests`, icon: UsersIcon, permission: 'guests:read' },
        { name: ls('Profiles', 'Perfiles'), href: `/${locale}/staff/profiles`, icon: IdentificationIcon, permission: 'guests:read' },
        { name: ls('Transfers', 'Traslados'), href: `/${locale}/staff/transfers`, icon: TruckIcon, permission: 'transfers:read' },
        { name: ls('Tours & Activities', 'Tours y Actividades'), href: `/${locale}/staff/tour-bookings`, icon: MapIcon, permission: 'tours:read' },
        { name: ls('Special Requests', 'Solicitudes'), href: `/${locale}/staff/special-requests`, icon: SparklesIcon, permission: 'reservations:manage' },
        { name: ls('Hotel Bookings', 'Hoteles'), href: `/${locale}/staff/hotel-bookings`, icon: BuildingOfficeIcon, permission: 'reservations:manage' },
        { name: ls('Romantic Dinners', 'Cenas Románticas'), href: `/${locale}/staff/romantic-dinners`, icon: HeartIcon, permission: 'reservations:manage' },
        { name: ls('Billing', 'Facturación'), href: `/${locale}/staff/billing`, icon: CurrencyDollarIcon, permission: 'reservations:manage' },
        { name: ls('Daily Sheet', 'Hoja Diaria'), href: `/${locale}/staff/daily-sheet`, icon: PrinterIcon, permission: 'reports:view' },
      ],
    },
    {
      key: 'fnb',
      label: ls('Food & Beverage', 'Alimentos'),
      icon: ShoppingCartIcon,
      items: [
        { name: ls('Orders', 'Órdenes'), href: `/${locale}/staff/orders`, icon: ShoppingCartIcon, permission: 'orders:read' },
      ],
    },
    {
      key: 'comms',
      label: ls('Communications', 'Comunicaciones'),
      icon: ChatBubbleLeftRightIcon,
      items: [
        { name: ls('Messages', 'Mensajes'), href: `/${locale}/staff/messages`, icon: ChatBubbleLeftRightIcon },
        { name: ls('Email', 'Correo'), href: `/${locale}/staff/email`, icon: EnvelopeIcon },
      ],
    },
    {
      key: 'admin',
      label: ls('Admin', 'Admin'),
      icon: Cog6ToothIcon,
      permission: 'staff:manage',
      items: [
        { name: ls('User Management', 'Gestión de Usuarios'), href: `/${locale}/staff/users`, icon: UsersIcon, permission: 'staff:manage' },
        { name: ls('Vendors', 'Proveedores'), href: `/${locale}/staff/vendors`, icon: UserGroupIcon, permission: 'settings:manage' },
        { name: ls('Tour Products', 'Productos de Tours'), href: `/${locale}/staff/tour-products`, icon: MapIcon, permission: 'tours:products:manage' },
        { name: ls('Data Curation', 'Curación de Datos'), href: `/${locale}/staff/settings`, icon: CircleStackIcon, permission: 'settings:manage' },
      ],
    },
  ];

  const groups = allGroups
    .map(g => ({
      ...g,
      items: g.items.filter(item => !item.permission || can(item.permission)),
    }))
    .filter(g => g.items.length > 0 && (!g.permission || can(g.permission)));

  const dashboardHref = `/${locale}/staff/dashboard`;
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + '/');

  const findActiveGroup = useCallback((): string | null => {
    for (const g of allGroups) {
      if (g.items.some(item => isActive(item.href))) return g.key;
    }
    return null;
  }, [pathname]);

  useEffect(() => {
    const detected = findActiveGroup();
    if (detected) {
      setActiveGroup(detected);
      setPanelOpen(true);
    }
  }, [pathname]);

  const groupDashboards: Record<string, string> = {
    concierge: `/${locale}/staff/concierge`,
    fnb:       `/${locale}/staff/orders`,
    comms:     `/${locale}/staff/messages`,
    admin:     `/${locale}/staff/users`,
  };

  const handleGroupClick = (key: string) => {
    router.push(groupDashboards[key] ?? `/${locale}/staff/dashboard`);
  };

  const handleGroupHoverEnter = (key: string) => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
    setActiveGroup(key);
    setPanelOpen(true);
  };

  const handleGroupHoverLeave = () => {
    hoverTimerRef.current = setTimeout(() => {
      setPanelOpen(false);
    }, 300);
  };

  const handlePanelHoverEnter = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
  };

  const handlePanelHoverLeave = () => {
    hoverTimerRef.current = setTimeout(() => {
      setPanelOpen(false);
    }, 300);
  };

  const closePanel = () => setPanelOpen(false);

  const currentGroup = groups.find(g => g.key === activeGroup);
  const isDashboardActive = pathname === dashboardHref || pathname.includes('/dashboard');

  return (
    <div className="min-h-screen" style={{ background: 'var(--bg)' }}>
      <GuestDrawer guestId={guestId} onClose={closeGuest} />

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 lg:hidden"
          style={{ background: 'rgba(14,26,9,0.45)', backdropFilter: 'blur(2px)' }}
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ===== SIDEBAR ===== */}
      <div
        className={`fixed inset-y-0 left-0 z-50 flex transform transition-transform duration-300 lg:translate-x-0 ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Icon Rail */}
        <div
          className="flex flex-col flex-shrink-0"
          style={{ width: RAIL_WIDTH, background: 'var(--sidebar-bg)', zIndex: 2 }}
        >
          {/* Logo */}
          <div
            className="flex items-center justify-center flex-shrink-0"
            style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.07)' }}
          >
            <Link
              href={dashboardHref}
              className="flex items-center justify-center rounded-full transition-shadow"
              style={{
                width: 38,
                height: 38,
                background: 'linear-gradient(135deg, var(--gold) 0%, #8a7352 100%)',
                fontFamily: "var(--font-gelasio), Georgia, serif",
                fontStyle: 'italic',
                fontWeight: 700,
                fontSize: 14,
                color: '#fff',
                textDecoration: 'none',
              }}
              onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 16px rgba(170,142,103,0.35)')}
              onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
            >
              N
            </Link>
          </div>

          {/* Nav icons */}
          <nav className="flex-1 flex flex-col py-3 gap-0.5 overflow-y-auto">
            {/* Dashboard */}
            <RailIcon
              icon={HomeIcon}
              label={ls('Dashboard', 'Panel')}
              active={isDashboardActive}
              onClick={() => { closePanel(); setActiveGroup(null); router.push(dashboardHref); }}
              showTooltip={!panelOpen}
            />

            <div style={{ height: 1, margin: '8px 16px', background: 'rgba(255,255,255,0.08)' }} />

            {/* Group icons */}
            {groups.map(g => {
              const GroupIcon = g.icon;
              const isGroupActive = activeGroup === g.key;
              const hasActivePage = g.items.some(item => isActive(item.href));
              return (
                <RailIcon
                  key={g.key}
                  icon={GroupIcon}
                  label={g.label}
                  active={isGroupActive && panelOpen}
                  hasActivePage={hasActivePage}
                  onClick={() => handleGroupClick(g.key)}
                  onHoverEnter={() => handleGroupHoverEnter(g.key)}
                  onHoverLeave={handleGroupHoverLeave}
                  showTooltip={!panelOpen}
                />
              );
            })}
          </nav>

          {/* Leaf decoration */}
          <div className="flex justify-center py-3" style={{ opacity: 0.12 }}>
            <svg viewBox="0 0 24 24" fill="#4E5E3E" style={{ width: 24, height: 24 }}>
              <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" />
            </svg>
          </div>

          {/* Logout */}
          <div className="flex-shrink-0 pb-3" style={{ borderTop: '1px solid rgba(255,255,255,0.07)' }}>
            <RailIcon
              icon={ArrowRightOnRectangleIcon}
              label={ls('Sign Out', 'Cerrar Sesión')}
              active={false}
              onClick={handleLogout}
              showTooltip={!panelOpen}
              variant="logout"
            />
          </div>
        </div>

        {/* Expandable Panel */}
        <div
          className="flex flex-col overflow-hidden"
          onMouseEnter={handlePanelHoverEnter}
          onMouseLeave={handlePanelHoverLeave}
          style={{
            width: panelOpen && currentGroup ? PANEL_WIDTH : 0,
            background: '#121f0d',
            borderRight: '1px solid rgba(255,255,255,0.06)',
            transition: 'width 0.28s cubic-bezier(0.34,1.56,0.64,1)',
            zIndex: 1,
            boxShadow: '4px 0 24px rgba(0,0,0,0.2)',
          }}
        >
          {currentGroup && (
            <>
              {/* Panel header */}
              <div
                className="flex items-center justify-between flex-shrink-0 px-4"
                style={{
                  height: 64,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                  minWidth: PANEL_WIDTH,
                }}
              >
                <span
                  className="font-bold italic"
                  style={{
                    fontFamily: "var(--font-gelasio), Georgia, serif",
                    fontSize: 15,
                    color: 'var(--gold)',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {currentGroup.label}
                </span>
                <button
                  onClick={closePanel}
                  className="flex items-center justify-center rounded-lg transition-colors"
                  style={{
                    width: 28,
                    height: 28,
                    background: 'rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.4)',
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.8)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                  }}
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5" />
                </button>
              </div>

              {/* Panel items */}
              <div className="flex-1 overflow-y-auto p-2" style={{ minWidth: PANEL_WIDTH }}>
                {currentGroup.items.map(item => {
                  const Icon = item.icon;
                  const active = isActive(item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMobileOpen(false)}
                      className="relative flex items-center gap-2.5 rounded-lg"
                      style={{
                        padding: '9px 12px',
                        fontSize: 13,
                        fontWeight: active ? 600 : 500,
                        color: active ? 'var(--gold)' : 'rgba(255,255,255,0.55)',
                        background: active ? 'rgba(170,142,103,0.15)' : 'transparent',
                        whiteSpace: 'nowrap',
                        transition: 'background 0.12s ease, color 0.12s ease',
                        textDecoration: 'none',
                      }}
                      onMouseEnter={e => {
                        if (!active) {
                          e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
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
                      {active && (
                        <span
                          className="absolute left-0 rounded-r"
                          style={{
                            top: 6,
                            bottom: 6,
                            width: 2,
                            background: 'var(--gold)',
                          }}
                        />
                      )}
                      <Icon className="h-4 w-4 flex-shrink-0" style={{ opacity: active ? 1 : 0.6 }} />
                      {item.name}
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ===== MAIN CONTENT ===== */}
      <style>{`
        @media (min-width: 1024px) {
          .staff-main-content {
            padding-left: ${RAIL_WIDTH + (panelOpen && currentGroup ? PANEL_WIDTH : 0)}px;
            transition: padding-left 0.28s cubic-bezier(0.34,1.56,0.64,1);
          }
        }
      `}</style>
      <div className="staff-main-content flex flex-col min-h-screen">
          {/* Top header */}
          <header
            className="flex-shrink-0"
            style={{
              background: 'var(--surface)',
              borderBottom: '1px solid var(--separator)',
              boxShadow: '0 1px 4px rgba(78,94,62,0.08)',
            }}
          >
            <div className="flex items-center justify-between h-12 px-5">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setMobileOpen(true)}
                  className="lg:hidden p-1.5 rounded-lg transition-colors"
                  style={{ color: 'var(--muted-dim)' }}
                >
                  <Bars3Icon className="h-5 w-5" />
                </button>
                <span
                  className="hidden lg:block italic"
                  style={{
                    fontFamily: "var(--font-gelasio), Georgia, serif",
                    fontSize: 15,
                    color: 'var(--charcoal)',
                  }}
                >
                  {ls('Good morning', 'Buenos días')}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className="hidden sm:block"
                  style={{
                    fontFamily: "'DM Mono', monospace",
                    fontSize: 13,
                    color: 'var(--sage)',
                  }}
                >
                  {new Date().toLocaleTimeString(locale === 'es' ? 'es-CR' : 'en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
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
                  className="flex items-center justify-center rounded-full transition-shadow"
                  style={{
                    width: 30,
                    height: 30,
                    background: 'var(--sage)',
                    border: '2px solid var(--gold)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 700,
                  }}
                  onMouseEnter={e => (e.currentTarget.style.boxShadow = '0 0 0 3px rgba(170,142,103,0.2)')}
                  onMouseLeave={e => (e.currentTarget.style.boxShadow = 'none')}
                >
                  S
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

function RailIcon({
  icon: Icon,
  label,
  active,
  hasActivePage,
  onClick,
  onHoverEnter,
  onHoverLeave,
  showTooltip,
  variant,
}: {
  icon: React.ElementType;
  label: string;
  active: boolean;
  hasActivePage?: boolean;
  onClick: () => void;
  onHoverEnter?: () => void;
  onHoverLeave?: () => void;
  showTooltip: boolean;
  variant?: 'logout';
}) {
  const [hovered, setHovered] = useState(false);

  const isLogout = variant === 'logout';
  let iconColor = 'rgba(255,255,255,0.38)';
  if (active) iconColor = '#fff';
  else if (hasActivePage) iconColor = 'rgba(255,255,255,0.7)';
  else if (hovered && isLogout) iconColor = '#EC6C4B';
  else if (hovered) iconColor = 'rgba(255,255,255,0.9)';

  let bg = 'transparent';
  if (hovered && isLogout) bg = 'rgba(236,108,75,0.08)';
  else if (hovered && !active) bg = 'rgba(255,255,255,0.05)';

  return (
    <button
      onClick={onClick}
      onMouseEnter={() => { setHovered(true); onHoverEnter?.(); }}
      onMouseLeave={() => { setHovered(false); onHoverLeave?.(); }}
      className="relative flex items-center justify-center"
      style={{
        width: RAIL_WIDTH,
        height: 48,
        color: iconColor,
        background: bg,
        border: 'none',
        cursor: 'pointer',
        transition: 'color 0.15s ease, background 0.15s ease',
      }}
    >
      {/* Active indicator bar */}
      {(active || hasActivePage) && (
        <span
          className="absolute left-0 rounded-r"
          style={{
            top: 8,
            bottom: 8,
            width: 3,
            background: active ? 'var(--sage)' : 'rgba(78,94,62,0.4)',
            transition: 'transform 0.3s cubic-bezier(0.34,1.56,0.64,1)',
          }}
        />
      )}
      {/* Active bg glow */}
      {active && (
        <span
          className="absolute rounded-xl"
          style={{
            inset: '6px 10px',
            background: 'rgba(78,94,62,0.12)',
          }}
        />
      )}
      <Icon className="h-[22px] w-[22px]" style={{ position: 'relative', zIndex: 1 }} />

      {/* Tooltip */}
      {showTooltip && hovered && (
        <span
          className="absolute z-[200] rounded-lg font-semibold"
          style={{
            left: RAIL_WIDTH,
            top: '50%',
            transform: 'translateY(-50%)',
            background: '#1A1A1A',
            color: '#fff',
            fontSize: 12,
            padding: '6px 12px',
            whiteSpace: 'nowrap',
            boxShadow: '0 4px 12px rgba(0,0,0,0.25)',
            pointerEvents: 'none',
          }}
        >
          <span
            className="absolute"
            style={{
              left: -4,
              top: '50%',
              transform: 'translateY(-50%)',
              border: '4px solid transparent',
              borderRightColor: '#1A1A1A',
            }}
          />
          {label}
        </span>
      )}
    </button>
  );
}

export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <GuestDrawerProvider>
      <StaffLayoutContent>{children}</StaffLayoutContent>
    </GuestDrawerProvider>
  );
}
