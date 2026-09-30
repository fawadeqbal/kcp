import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ConsentList } from '@/components/consent-list';

export const metadata: Metadata = { title: 'Parental consent' };

export default function ConsentsPage() {
  return (
    <Suspense>
      <ConsentList />
    </Suspense>
  );
}
