import type { Metadata } from 'next';
import { HubProjectDetail } from '@/components/hub/projects';

export const metadata: Metadata = { title: 'Hub project' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HubProjectDetail id={id} />;
}
