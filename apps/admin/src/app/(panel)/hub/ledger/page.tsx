import type { Metadata } from 'next';
import { HubLedgerPage } from '@/components/hub/money';

export const metadata: Metadata = { title: 'Ledger' };

export default function Page() {
  return <HubLedgerPage />;
}
