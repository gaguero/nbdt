'use client';

import Link from 'next/link';
import { useTranslations } from 'next-intl';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const t = useTranslations('footer');

  return (
    <footer className="bg-brand-shadow text-brand-white">
      <div className="max-w-7xl mx-auto px-content py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <div className="text-2xl font-heading font-bold text-brand-accent mb-4">
              Nayara
            </div>
            <p className="text-brand-white/85 text-sm leading-relaxed">
              {t('description')}
            </p>
          </div>

          <div>
            <h4 className="text-lg font-heading font-semibold text-brand-accent mb-4">
              {t('quickLinks')}
            </h4>
            <ul className="space-y-2">
              <li>
                <Link
                  href="/"
                  className="text-brand-white/85 hover:text-brand-accent transition-colors text-sm"
                >
                  {t('home')}
                </Link>
              </li>
              <li>
                <Link
                  href="/menu"
                  className="text-brand-white/85 hover:text-brand-accent transition-colors text-sm"
                >
                  {t('menu')}
                </Link>
              </li>
              <li>
                <Link
                  href="/orders"
                  className="text-brand-white/85 hover:text-brand-accent transition-colors text-sm"
                >
                  {t('orders')}
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-lg font-heading font-semibold text-brand-accent mb-4">
              {t('contact')}
            </h4>
            <div className="space-y-3">
              <div className="flex items-start space-x-3">
                <svg
                  className="w-5 h-5 text-brand-accent mt-0.5 flex-shrink-0"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
                <a
                  href="mailto:info@nayara.com"
                  className="text-brand-white/85 hover:text-brand-accent transition-colors text-sm"
                >
                  info@nayara.com
                </a>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-brand-white/20 mt-8 pt-8">
          <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
            <div className="text-center md:text-left">
              <p className="text-brand-white/70 text-sm">
                {currentYear} {t('copyright')}
              </p>
            </div>

            <div className="flex items-center space-x-6 text-sm">
              <Link
                href="/privacy"
                className="text-brand-white/70 hover:text-brand-accent transition-colors"
              >
                {t('privacyPolicy')}
              </Link>
              <Link
                href="/terms"
                className="text-brand-white/70 hover:text-brand-accent transition-colors"
              >
                {t('termsOfService')}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}
