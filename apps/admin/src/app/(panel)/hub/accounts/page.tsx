import type { Metadata } from 'next';
import { HubAccountsPage } from '@/components/hub/money';

export const metadata: Metadata = { title: 'Payout accounts' };

export default function Page() {
  return <HubAccountsPage />;
}
