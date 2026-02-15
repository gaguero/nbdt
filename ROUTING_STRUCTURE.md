# Routing Structure - Nayara Ordering System

## Visual Hierarchy

```
/
├── page.tsx (redirects to /en/guest)
│
└── [locale]/ (en, es)
    ├── layout.tsx (Root Layout with NextIntlProvider)
    │
    ├── guest/
    │   ├── layout.tsx (Navbar + Footer)
    │   ├── page.tsx (Language Selector)
    │   ├── menu/ (Phase 2/3)
    │   ├── orders/ (Phase 3)
    │   └── bookings/ (Phase 3)
    │
    └── staff/
        ├── layout.tsx (Sidebar + Header)
        ├── login/
        │   └── page.tsx (Login Form)
        │
        └── (authenticated)/
            ├── layout.tsx (Auth Check)
            ├── dashboard/
            │   └── page.tsx (Dashboard)
            ├── orders/ (Phase 3)
            ├── bookings/ (Phase 3)
            ├── menu/ (Phase 3)
            ├── analytics/ (Phase 3)
            └── settings/ (Phase 3)
```

## URL Examples

### Guest Routes
- `/` → redirects to `/en/guest`
- `/en/guest` → Language selector (English interface)
- `/es/guest` → Language selector (Spanish interface)
- `/en/guest/menu` → Menu page (Phase 2/3)
- `/es/guest/menu` → Menu page in Spanish (Phase 2/3)

### Staff Routes
- `/en/staff/login` → Staff login page
- `/es/staff/login` → Staff login page in Spanish
- `/en/staff/dashboard` → Staff dashboard (protected)
- `/es/staff/dashboard` → Staff dashboard in Spanish (protected)
- `/en/staff/orders` → Orders management (Phase 3, protected)
- `/en/staff/bookings` → Bookings management (Phase 3, protected)
- `/en/staff/menu` → Menu management (Phase 3, protected)
- `/en/staff/analytics` → Analytics (Phase 3, protected)
- `/en/staff/settings` → Settings (Phase 3, protected)

## Layout Nesting

### Guest Pages
```
RootLayout ([locale]/layout.tsx)
  └── GuestLayout (guest/layout.tsx)
      └── GuestPage (guest/page.tsx)
```

**Components Used:**
- NextIntlClientProvider (root)
- Navbar (guest layout)
- Footer (guest layout)

### Staff Login
```
RootLayout ([locale]/layout.tsx)
  └── StaffLayout (staff/layout.tsx)
      └── LoginPage (staff/login/page.tsx)
```

**Components Used:**
- NextIntlClientProvider (root)
- Sidebar navigation (staff layout)
- Header with notifications (staff layout)

### Staff Dashboard (Protected)
```
RootLayout ([locale]/layout.tsx)
  └── StaffLayout (staff/layout.tsx)
      └── AuthenticatedLayout (staff/(authenticated)/layout.tsx)
          └── DashboardPage (staff/(authenticated)/dashboard/page.tsx)
```

**Components Used:**
- NextIntlClientProvider (root)
- Sidebar navigation (staff layout)
- Header with notifications (staff layout)
- Auth verification (authenticated layout)

## API Routes

### Authentication
- `POST /api/auth/login` - Staff login
- `POST /api/auth/logout` - Staff logout
- `GET /api/auth/verify` - Verify authentication status

### Future (Phase 3)
- `/api/menu/*` - Menu management
- `/api/orders/*` - Orders management
- `/api/bookings/*` - Bookings management
- `/api/staff/*` - Staff management
- `/api/analytics/*` - Analytics data

## Middleware

The project uses Next.js middleware for:
1. Locale detection and routing
2. Authentication checks for protected routes
3. Cookie management for JWT tokens

## Protected Routes

All routes under `staff/(authenticated)/*` require authentication:
- Dashboard
- Orders
- Bookings
- Menu management
- Analytics
- Settings

If a user tries to access these without being authenticated, they are redirected to `/[locale]/staff/login`.

## Public Routes

These routes are accessible without authentication:
- `/` - Root
- `/[locale]/guest/*` - All guest pages
- `/[locale]/staff/login` - Staff login page

## Translation Keys

### Guest Pages
- `landing.welcome` - Welcome message
- `landing.subtitle` - Language selection prompt

### Staff Pages
- `staff.nav.*` - Navigation items
- `staff.login.*` - Login form labels
- `staff.dashboard.*` - Dashboard content

## Notes

- All routes support both `en` and `es` locales
- Locale prefix is required in all URLs
- Root `/` redirects to `/en/guest` (default locale)
- Staff routes use route groups `(authenticated)` to apply layout without affecting URL
- Guest and staff sections have completely separate layouts
- All layouts are fully responsive and mobile-friendly
