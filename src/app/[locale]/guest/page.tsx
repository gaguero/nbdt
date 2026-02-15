'use client';

import { useTranslations } from 'next-intl';
import { useRouter, usePathname } from 'next/navigation';
import Button from '@/components/ui/Button';

export default function GuestLandingPage() {
  const t = useTranslations('landing');
  const router = useRouter();
  const pathname = usePathname();

  const handleLanguageSelect = (locale: string) => {
    // Replace current locale in pathname with selected locale
    const newPathname = pathname.replace(/^\/[^\/]+/, `/${locale}`);
    router.push(`${newPathname}/menu`);
  };

  return (
    <div className="relative min-h-[calc(100vh-4rem)]">
      {/* Hero Background */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-brand-primary via-brand-shadow to-brand-primary">
        {/* Placeholder pattern overlay */}
        <div className="absolute inset-0 opacity-10" style={{
          backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'0.4\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
        }} />
        <div className="absolute inset-0 bg-black/30" />
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] px-4">
        <div className="text-center mb-12">
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-4">
            {t('welcome', { defaultValue: 'Welcome to Nayara' })}
          </h1>
          <p className="text-xl md:text-2xl text-white/90">
            {t('subtitle', { defaultValue: 'Please select your preferred language' })}
          </p>
        </div>

        <div className="flex flex-col sm:flex-row gap-6">
          <Button
            onClick={() => handleLanguageSelect('en')}
            variant="primary"
            size="large"
            className="w-64 h-20 text-2xl font-semibold"
          >
            English
          </Button>
          <Button
            onClick={() => handleLanguageSelect('es')}
            variant="primary"
            size="large"
            className="w-64 h-20 text-2xl font-semibold"
          >
            Español
          </Button>
        </div>
      </div>
    </div>
  );
}
