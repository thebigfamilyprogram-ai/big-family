import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  environment: process.env.NODE_ENV,

  // Capturar el 100% de errores en esta etapa temprana
  sampleRate: 1.0,
  // Solo 10% de trazas de performance para no gastar cuota
  tracesSampleRate: 0.1,

  ignoreErrors: [
    // ResizeObserver es un warning del navegador, no un error real
    'ResizeObserver loop limit exceeded',
    'ResizeObserver loop completed with undelivered notifications',
    // Errores inyectados por extensiones de navegador
    /chrome-extension:\/\//,
    /extensions\//,
    /^Script error\.?$/,
  ],

  beforeSend(event) {
    if (process.env.NODE_ENV === 'production') return event
    // En desarrollo, solo permitir el evento de prueba manual de Sentry
    if (event.exception?.values?.[0]?.value?.includes('Sentry integration check')) {
      return event
    }
    return null
  },
})
