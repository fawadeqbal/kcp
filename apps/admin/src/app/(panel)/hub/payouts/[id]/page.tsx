import type { Metadata } from 'next';
import { HubBatchDetail } from '@/components/hub/money';

export const metadata: Metadata = { title: 'Payout batch' };

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <HubBatchDetail id={id} />;
}
