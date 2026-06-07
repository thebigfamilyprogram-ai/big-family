import type { Metadata } from "next";
import "./globals.css";
import { Geist_Mono } from 'next/font/google'
import { ViewTransitions } from 'next-view-transitions'
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastContainer } from "@/components/Toast";
import { LazyMotion, domAnimation } from 'framer-motion'
import { getLocale } from 'next-intl/server'

const geistMono = Geist_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
  display: 'swap',
  preload: false,
})

export const metadata: Metadata = {
  title: "Big Family",
  description: "The Big Leader Program",
};

const CSS_VARS = `
  :root, html.light, html:not(.dark) {
    --bg: #F5F3EF;
    --bg-2: #EFECE6;
    --card-bg: #ffffff;
    --card-border: rgba(13,13,13,0.08);
    --ink: #0D0D0D;
    --ink-2: #2D2D2D;
    --mute: #6B6B6B;
    --line: rgba(13,13,13,0.10);
    --line-soft: rgba(13,13,13,0.06);
    --line-strong: rgba(13,13,13,0.14);
    --accent: #C0392B;
    --accent-hover: #a93226;
    --accent-amber: #D4821A;
    --accent-teal: #0F7B6C;
    --accent-muted: #8C7B6E;
    --shadow-card: 0 1px 3px rgba(13,13,13,0.06), 0 1px 2px rgba(13,13,13,0.04);
    --shadow-raised: 0 4px 16px rgba(13,13,13,0.08), 0 2px 4px rgba(13,13,13,0.04);
    --success-bg: #D1FAE5;
    --success-text: #065F46;
    --success-border: #A7F3D0;
    --surface-1: #F9F8F5;
    --surface-2: #F5F3EF;
    --surface-3: #EFECE6;
    --content-max-width: 1280px;
    --dashboard-padding: 32px;
  }
  html.dark {
    --bg: #0D0D0D;
    --bg-2: #111111;
    --card-bg: #1a1a1a;
    --card-border: rgba(255,255,255,0.08);
    --ink: #F5F3EF;
    --ink-2: #D0CEC9;
    --mute: #888888;
    --line: rgba(255,255,255,0.08);
    --line-soft: rgba(255,255,255,0.04);
    --line-strong: rgba(255,255,255,0.14);
    --accent: #C0392B;
    --accent-hover: #E05247;
    --accent-amber: #D4821A;
    --accent-teal: #0F7B6C;
    --accent-muted: #8C7B6E;
    --shadow-card: 0 1px 3px rgba(0,0,0,0.3), 0 1px 2px rgba(0,0,0,0.2);
    --shadow-raised: 0 4px 16px rgba(0,0,0,0.4), 0 2px 4px rgba(0,0,0,0.3);
    --success-bg: #D1FAE5;
    --success-text: #065F46;
    --success-border: #A7F3D0;
    --surface-1: #1C1B19;
    --surface-2: #141412;
    --surface-3: #1F1E1C;
    --content-max-width: 1280px;
    --dashboard-padding: 32px;
  }
`;

const ANTI_FLASH = `(function(){try{var t=localStorage.getItem('bf-theme');var d=document.documentElement;if(t==='dark'){d.classList.add('dark')}else if(t==='auto'){if(window.matchMedia('(prefers-color-scheme:dark)').matches){d.classList.add('dark')}else{d.classList.add('light')}}else{d.classList.add('light')}}catch(e){document.documentElement.classList.add('light')}})()`;

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const locale = await getLocale();
  return (
    <html key={locale} lang={locale} dir={locale === 'ar' ? 'rtl' : 'ltr'} suppressHydrationWarning className={geistMono.variable}>
      <head>
        <style dangerouslySetInnerHTML={{ __html: CSS_VARS }} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH }} />
        <link rel="preload" href="/fonts/satoshi-400.woff2" as="font" type="font/woff2" crossOrigin="" />
        <link rel="preload" href="/fonts/satoshi-900.woff2" as="font" type="font/woff2" crossOrigin="" />
        {locale === 'ar' && (
          <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;500;700&display=swap" rel="stylesheet" />
        )}
      </head>
      <body className="antialiased">
        <ViewTransitions>
          <ThemeProvider>
            <LazyMotion features={domAnimation}>
              {children}
              <ToastContainer />
            </LazyMotion>
          </ThemeProvider>
        </ViewTransitions>
      </body>
    </html>
  );
}
