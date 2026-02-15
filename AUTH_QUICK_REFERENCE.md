# Authentication System - Quick Reference Guide

## 🔑 Environment Setup

```env
# .env file (create this from .env.example)
DATABASE_URL=postgresql://user:password@localhost:5432/nayara_db
JWT_SECRET=your-super-secret-key-minimum-32-characters
JWT_EXPIRES_IN=7d
NODE_ENV=development
```

---

## 🗄️ Create Test User (SQL)

```sql
-- 1. Create property first (if not exists)
INSERT INTO properties (name, code, timezone, currency)
VALUES ('Nayara Bocas del Toro', 'NAYARA_BDT', 'America/Costa_Rica', 'USD')
RETURNING id;

-- 2. Generate password hash (Node.js)
-- Run: node -e "const bcrypt = require('bcrypt'); bcrypt.hash('password123', 10).then(console.log)"

-- 3. Create staff user
INSERT INTO staff_users (
  property_id,
  email,
  password_hash,
  first_name,
  last_name,
  role,
  permissions
) VALUES (
  'your-property-uuid-here',
  'admin@nayara.com',
  'your-bcrypt-hash-here',
  'Admin',
  'User',
  'admin',
  ARRAY['view_orders', 'manage_menu', 'manage_staff']
);
```

---

## 🌐 API Endpoints

### Login
```bash
POST /api/auth/login
Content-Type: application/json

{
  "email": "admin@nayara.com",
  "password": "password123"
}

# Success: 200 + Sets cookie
# Error: 400 (validation), 401 (invalid), 403 (inactive)
```

### Get Current User
```bash
GET /api/auth/me
# Requires cookie from login

# Success: 200 + user object
# Error: 401 (not authenticated), 404 (user not found)
```

### Logout
```bash
POST /api/auth/logout
# Clears auth cookie

# Success: 200
```

---

## 🔐 Protected Routes

All routes under `/[locale]/staff/*` are protected EXCEPT:
- `/[locale]/staff/login` (login page)

Unauthenticated users are redirected to:
```
/[locale]/staff/login?redirect=/original/path
```

---

## ⚛️ Using Authentication in React Components

### Basic Usage

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function MyComponent() {
  const { user, loading, isAuthenticated } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!isAuthenticated) return <div>Please log in</div>;

  return (
    <div>
      <h1>Welcome, {user.firstName} {user.lastName}!</h1>
      <p>Email: {user.email}</p>
      <p>Role: {user.role}</p>
    </div>
  );
}
```

### Check Permissions

```typescript
import { useAuth, hasPermission } from '@/hooks/useAuth';

export default function MenuManager() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const canManageMenu = hasPermission(user, 'manage_menu');

  return (
    <div>
      {canManageMenu ? (
        <button>Edit Menu</button>
      ) : (
        <p>You don't have permission to manage the menu</p>
      )}
    </div>
  );
}
```

### Check Roles

```typescript
import { useAuth, hasRole, hasAnyRole } from '@/hooks/useAuth';

export default function AdminPanel() {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) return null;

  const isAdmin = hasRole(user, 'admin');
  const canAccessPanel = hasAnyRole(user, ['admin', 'manager']);

  return (
    <div>
      {canAccessPanel && <div>Admin Panel Content</div>}
      {isAdmin && <button>Manage Staff</button>}
    </div>
  );
}
```

### Logout Button

```typescript
'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';

export default function LogoutButton() {
  const router = useRouter();
  const { refetch } = useAuth();

  const handleLogout = async () => {
    try {
      const response = await fetch('/api/auth/logout', {
        method: 'POST'
      });

      if (response.ok) {
        await refetch(); // Update auth state
        router.push('/staff/login');
      }
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  return (
    <button onClick={handleLogout} className="btn-logout">
      Logout
    </button>
  );
}
```

---

## 🛡️ Security Features

| Feature | Implementation |
|---------|---------------|
| Password Hashing | bcrypt with 10 salt rounds |
| Token Type | JWT (JSON Web Token) |
| Token Expiry | 7 days (configurable) |
| Cookie Type | httpOnly, secure, sameSite: lax |
| CSRF Protection | SameSite cookie policy |
| Route Protection | Next.js middleware |
| SQL Injection | Parameterized queries |
| Password in Response | Never included |

---

## 🧪 Testing Checklist

- [ ] User can login with valid credentials
- [ ] Invalid credentials show error message
- [ ] Inactive account cannot login
- [ ] Protected routes redirect to login when not authenticated
- [ ] After login, user is redirected to intended page
- [ ] Cookie is set with httpOnly flag
- [ ] Logout clears the cookie
- [ ] `/api/auth/me` returns current user when authenticated
- [ ] Locale is preserved in redirects
- [ ] Password is never returned in API responses

---

## 🐛 Common Issues & Solutions

### "JWT_SECRET is not defined"
```bash
# Add to .env file
JWT_SECRET=your-secret-key-at-least-32-characters-long
```

### "Database connection failed"
```bash
# Check .env file
DATABASE_URL=postgresql://user:password@localhost:5432/database_name

# Test connection
npm run db:migrate
```

### "Cannot find module '@/lib/auth'"
```bash
# Restart Next.js dev server
npm run dev
```

### "Cookie not being set"
```bash
# In development, ensure NODE_ENV is set
NODE_ENV=development npm run dev

# In production, ensure HTTPS is enabled
```

### "Redirect loop on login page"
```bash
# Check middleware.ts - login page should be in PUBLIC_ROUTE_PATTERNS
```

---

## 📝 User Roles

| Role | Description | Typical Permissions |
|------|-------------|---------------------|
| `admin` | Full system access | All permissions |
| `manager` | Property management | Manage orders, menu, bookings |
| `staff` | Front desk staff | View orders, create bookings |
| `kitchen` | Kitchen staff | View/update kitchen orders |
| `front_desk` | Reception | Guest check-in, room management |

---

## 🔄 Auth Flow Diagram

```
1. User visits /staff/dashboard
   ↓
2. Middleware checks for auth cookie
   ↓
3a. Cookie exists & valid → Allow access
3b. No cookie or invalid → Redirect to /staff/login?redirect=/staff/dashboard
   ↓
4. User enters credentials → POST /api/auth/login
   ↓
5. Server validates → Sets cookie → Returns user data
   ↓
6. Client redirects to /staff/dashboard (from redirect param)
   ↓
7. Middleware allows access (cookie is now valid)
```

---

## 📚 Available Utilities

### From `@/lib/auth`
```typescript
import {
  generateToken,
  verifyToken,
  hashPassword,
  comparePassword,
  AUTH_COOKIE_NAME,
  COOKIE_OPTIONS
} from '@/lib/auth';
```

### From `@/hooks/useAuth`
```typescript
import {
  useAuth,
  hasPermission,
  hasRole,
  hasAnyRole
} from '@/hooks/useAuth';
```

---

## 🚀 Quick Start

```bash
# 1. Install dependencies (already done)
npm install

# 2. Set up environment
cp .env.example .env
# Edit .env with your values

# 3. Run database migrations
npm run db:migrate

# 4. Create a test user (see SQL section above)

# 5. Start development server
npm run dev

# 6. Visit login page
http://localhost:3000/en/staff/login

# 7. Login with test credentials
```

---

## 📞 Support

For issues or questions:
1. Check TASK_6_IMPLEMENTATION_SUMMARY.md for detailed documentation
2. Review this quick reference
3. Check browser console for errors
4. Verify environment variables are set correctly

---

**Last Updated:** February 7, 2026
