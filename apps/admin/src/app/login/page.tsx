import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginFlow } from '@/components/login-flow';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <Suspense>
        <LoginFlow />
      </Suspense>
    </main>
  );
}
