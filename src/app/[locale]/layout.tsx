import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import HtmlDirSync from '@/components/HtmlDirSync';

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
      {children}
    </NextIntlClientProvider>
  );
}
