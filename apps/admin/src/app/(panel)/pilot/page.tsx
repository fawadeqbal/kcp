import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PilotNumbers } from '@/components/pilot-numbers';

export const metadata: Metadata = { title: 'Pilot numbers' };

export default function PilotPage() {
  return (
    <Suspense>
      <PilotNumbers />
    </Suspense>
  );
}
