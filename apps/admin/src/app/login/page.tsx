import { LogoMark } from '@kcp/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { LoginFlow } from '@/components/login-flow';

export const metadata: Metadata = { title: 'Log in' };

export default function LoginPage() {
  return (
    <main className="flex min-h-dvh items-center justify-center px-4 py-12">
      <div className="relative w-full max-w-lg overflow-hidden rounded-card bg-surface px-6 py-9 sm:px-10">
        <span
          aria-hidden="true"
          className="absolute -end-12 -top-12 size-36 rounded-full bg-brand-200"
        />
        <span
          aria-hidden="true"
          className="absolute -start-10 -bottom-14 size-32 rounded-full bg-sage-200"
        />
        <div className="relative flex flex-col gap-7">
          <p className="flex items-center gap-2.5">
            <LogoMark />
            <span className="font-display text-xl">KCP Admin</span>
          </p>
          <Suspense>
            <LoginFlow />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
