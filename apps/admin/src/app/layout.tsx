import '@fontsource-variable/noto-sans/index.css';
import '@fontsource-variable/noto-sans-arabic/index.css';
import './globals.css';
import type { Metadata } from 'next';
import { connection } from 'next/server';
import type { ReactNode } from 'react';
import { AuthProvider } from '@/lib/auth';

export const metadata: Metadata = {
  title: { default: 'KCP Admin', template: '%s · KCP Admin' },
  robots: { index: false, follow: false },
};

// Staff-only tool, in English. Names people typed in Arabic or Urdu still render
// thanks to the Arabic font. Every page renders per request, so its scripts carry
// that request's nonce (src/proxy.ts).
export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  return (
    <html lang="en" dir="ltr">
      <body className="min-h-dvh antialiased">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
