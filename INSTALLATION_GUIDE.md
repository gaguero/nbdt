# Nayara Ordering System - Installation & Setup Guide

## Prerequisites
- Node.js 18.x or higher
- npm or yarn package manager

## Installation Steps

### 1. Install Dependencies
```bash
cd C:\Users\jovy2\nayara-ordering-system
npm install
```

This will install all required dependencies including:
- Next.js 15.3.3
- React 19
- next-intl 4.1.0
- TypeScript 5
- Tailwind CSS 3.4.1
- And all other dependencies

### 2. Set Up Environment Variables
Copy the example environment file:
```bash
cp .env.example .env
```

Edit `.env` and add your database connection string and other configuration.

### 3. Run Database Migrations
```bash
npm run db:migrate
```

### 4. Seed the Database (Optional)
```bash
npm run db:seed
```

### 5. Start Development Server
```bash
npm run dev
```

The application will be available at `http://localhost:3000`

## Component Library Testing

To view the component showcase page, create a test page at `app/[locale]/showcase/page.tsx`:

```tsx
import ComponentShowcase from '@/components/ui/ComponentShowcase';

export default function ShowcasePage() {
  return <ComponentShowcase />;
}
```

Then visit: `http://localhost:3000/en/showcase` or `http://localhost:3000/es/showcase`

## Verification Checklist

After installation, verify:
- ✅ Development server starts without errors
- ✅ Language switcher works (EN/ES)
- ✅ All UI components render correctly
- ✅ Tailwind styles are applied
- ✅ TypeScript compilation succeeds

## Build for Production

```bash
npm run build
```

Then start the production server:
```bash
npm start
```

## Common Issues

### Issue: "Module not found" errors
**Solution:** Run `npm install` to ensure all dependencies are installed

### Issue: Tailwind styles not applied
**Solution:** Ensure `tailwind.config.ts` includes correct content paths and restart dev server

### Issue: Translation not found
**Solution:** Check that `messages/en.json` and `messages/es.json` exist and are properly formatted

### Issue: next-intl routing issues
**Solution:** Verify `next.config.ts` includes the next-intl plugin configuration

## Project Structure

```
nayara-ordering-system/
├── app/                          # Next.js app directory
│   ├── [locale]/                # Locale-based routing
│   └── api/                     # API routes
├── src/
│   ├── components/
│   │   ├── ui/                  # UI component library
│   │   │   ├── Button.tsx
│   │   │   ├── Card.tsx
│   │   │   ├── Input.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── Toast.tsx
│   │   │   ├── ComponentShowcase.tsx
│   │   │   └── index.ts
│   │   ├── i18n/                # i18n components
│   │   │   └── LanguageSwitcher.tsx
│   │   ├── layout/              # Layout components
│   │   │   ├── Navbar.tsx
│   │   │   └── Footer.tsx
│   │   └── README.md
│   └── i18n/                    # i18n configuration
│       ├── navigation.ts
│       ├── request.ts
│       └── routing.ts
├── messages/                     # Translation files
│   ├── en.json
│   └── es.json
├── scripts/                      # Database scripts
├── tailwind.config.ts           # Tailwind configuration
├── next.config.ts               # Next.js configuration
└── package.json
```

## Next Development Steps

1. Create page layouts using the component library
2. Build menu item cards using Card components
3. Implement order forms with Input and Button components
4. Add authentication pages
5. Create admin dashboard

For detailed component documentation, see `src/components/README.md`
