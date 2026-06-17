import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import HtmlDirSync from '@/components/HtmlDirSync';
import SentryUserSync from '@/components/SentryUserSync';

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <HtmlDirSync />
      <SentryUserSync />
      {children}
    </NextIntlClientProvider>
  );
}
