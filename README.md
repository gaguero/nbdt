# Nayara Ordering System

A Next.js 15.3.3 multilingual guest ordering system for Nayara Bocas del Toro.

## Features

- Next.js 15.3.3 with App Router
- TypeScript support
- Tailwind CSS for styling
- Internationalization with next-intl
- PostgreSQL database
- JWT authentication
- Guest and staff interfaces

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

4. Seed the database:
```bash
npm run db:seed
```

5. Run the development server:
```bash
npm run dev
```

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
