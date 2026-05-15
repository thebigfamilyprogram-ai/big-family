import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { ThemeProvider } from "@/contexts/ThemeContext";
import { ToastContainer } from "@/components/Toast";

const geistSans = localFont({
  src: "./fonts/GeistVF.woff",
  variable: "--font-geist-sans",
  weight: "100 900",
});
const geistMono = localFont({
  src: "./fonts/GeistMonoVF.woff",
  variable: "--font-geist-mono",
  weight: "100 900",
});

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
    --accent: #C0392B;
    --accent-hover: #a93226;
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
    --accent: #C0392B;
    --accent-hover: #E05247;
  }
`;

const ANTI_FLASH = `(function(){try{var t=localStorage.getItem('bf-theme');var d=document.documentElement;if(t==='dark'){d.classList.add('dark')}else if(t==='auto'){if(window.matchMedia('(prefers-color-scheme:dark)').matches){d.classList.add('dark')}else{d.classList.add('light')}}else{d.classList.add('light')}}catch(e){document.documentElement.classList.add('light')}})()`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <head>
        <style dangerouslySetInnerHTML={{ __html: CSS_VARS }} />
        {/* eslint-disable-next-line @next/next/no-sync-scripts */}
        <script dangerouslySetInnerHTML={{ __html: ANTI_FLASH }} />
        <link href="https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@1&family=Inter:wght@400;500;600&display=swap" rel="stylesheet" />
        <link href="https://api.fontshare.com/v2/css?f[]=satoshi@400,500,700,900&display=swap" rel="stylesheet" />
      </head>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <ThemeProvider>
          {children}
          <ToastContainer />
        </ThemeProvider>
      </body>
    </html>
  );
}
