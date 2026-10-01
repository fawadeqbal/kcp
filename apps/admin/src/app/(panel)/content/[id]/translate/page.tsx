import type { Metadata } from 'next';
import { Suspense } from 'react';
import { StudioModule } from '@/components/content-studio';

export const metadata: Metadata = { title: 'Translate' };

export default async function TranslatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return (
    <Suspense>
      <StudioModule id={id} />
    </Suspense>
  );
}
