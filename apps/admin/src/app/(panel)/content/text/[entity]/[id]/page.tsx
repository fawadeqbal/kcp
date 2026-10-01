import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { StudioTextEditor } from '@/components/content-studio';

export const metadata: Metadata = { title: 'Translate a text' };

const ENTITIES = new Set(['lesson', 'challenge', 'project', 'quiz']);

export default async function TextPage({
  params,
}: {
  params: Promise<{ entity: string; id: string }>;
}) {
  const { entity, id } = await params;
  if (!ENTITIES.has(entity) || !/^[a-z0-9-]{1,100}$/.test(id)) notFound();
  return (
    <Suspense>
      <StudioTextEditor entity={entity} id={id} />
    </Suspense>
  );
}
