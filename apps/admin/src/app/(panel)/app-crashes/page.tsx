import type { Metadata } from 'next';
import { Suspense } from 'react';
import { AppCrashList } from '@/components/app-crash-list';

export const metadata: Metadata = { title: 'App crashes' };

export default function AppCrashesPage() {
  return (
    <Suspense>
      <AppCrashList />
    </Suspense>
  );
}
