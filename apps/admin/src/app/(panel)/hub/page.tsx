import type { Metadata } from 'next';
import { HubRequestsPage } from '@/components/hub/requests';

export const metadata: Metadata = { title: 'Hub' };

export default function Page() {
  return <HubRequestsPage />;
}
