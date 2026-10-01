import type { Metadata } from 'next';
import { HubRequestDetail } from '@/components/hub/requests';

export const metadata: Metadata = { title: 'Hub request' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HubRequestDetail id={id} />;
}
