# Nayara Ordering System

A Next.js 15.3.3 multilingual guest ordering system for Nayara Bocas del Toro.

## Features

### 🏨 Hospitality Operations
- **Opera PMS Sync**: Hourly XML import for reservations and guest data.
- **Concierge Modules**: Complete CRUD for Transfers, Tours, and Special Requests.
- **Data Curation Center**: Smart deduplication and normalization tools for legacy imports.
- **Multilingual**: Full support for English and Spanish (next-intl).

### 🔐 Security & Access Control
- **Granular RBAC**: Permission-based access (`resource:action`) for 11 distinct roles.
- **User Management**: Admin tools for staff creation, deactivation, and password resets.
- **Self-Service**: Dedicated staff profile management and secure password change.

### 🍽️ Guest Experience
- **Digital Concierge**: Guest-facing landing pages and order tracking.
- **Room Service**: F&B ordering system with KDS integration (Coming Soon).

## Tech Stack
- **Framework**: Next.js 15.3.3 (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Database**: PostgreSQL (pg)
- **Auth**: JWT (jose) + Bcrypt
- **Deployment**: Railway (Nixpacks)

## Getting Started

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.example .env.local
# Edit .env.local with your configuration
```

3. Run database migrations:
```bash
npm run db:migrate
```

4. Run the development server:
```bash
npm run dev
```

## Branch Strategy
- `master`: Production-ready code.
- `dev2`: Current development branch for User/Profile modules.


Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Project Structure

- `app/` - Next.js App Router pages and layouts
- `src/components/` - React components
  - `ui/` - Reusable UI components
  - `guest/` - Guest-facing components
  - `staff/` - Staff dashboard components
  - `i18n/` - Internationalization components
  - `layout/` - Layout components
- `src/lib/` - Utility functions and libraries
- `src/hooks/` - Custom React hooks
- `src/types/` - TypeScript type definitions
- `src/i18n/` - Internationalization configuration
- `src/messages/` - Translation files
- `scripts/` - Database migration and seeding scripts
- `public/` - Static assets

## Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint
- `npm run db:migrate` - Run database migrations
- `npm run db:seed` - Seed database with initial data

## Environment Variables

See `.env.example` for required environment variables.

## License

Private - All rights reserved.
