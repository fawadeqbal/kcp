import type { Metadata } from 'next';
import { Suspense } from 'react';
import { ModerationQueue } from '@/components/moderation';

export const metadata: Metadata = { title: 'Room moderation' };

export default function ModerationPage() {
  return (
    <Suspense>
      <ModerationQueue />
    </Suspense>
  );
}
