import type { Metadata } from 'next';
import { HubPayoutsPage } from '@/components/hub/money';

export const metadata: Metadata = { title: 'Payouts' };

export default function Page() {
  return <HubPayoutsPage />;
}
