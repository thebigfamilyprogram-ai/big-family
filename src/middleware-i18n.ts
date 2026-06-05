import createMiddleware from 'next-intl/middleware';

export const i18nMiddleware = createMiddleware({
  locales: ['es', 'en', 'fr', 'pt', 'ar'],
  defaultLocale: 'es',
  localePrefix: 'as-needed'
});
