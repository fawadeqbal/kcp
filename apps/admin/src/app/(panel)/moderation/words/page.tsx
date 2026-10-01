import type { Metadata } from 'next';
import { Suspense } from 'react';
import { BlockedWords } from '@/components/moderation';

export const metadata: Metadata = { title: 'Blocked words' };

export default function BlockedWordsPage() {
  return (
    <Suspense>
      <BlockedWords />
    </Suspense>
  );
}
