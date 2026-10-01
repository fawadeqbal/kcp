import type { Metadata } from 'next';
import { HubClientsPage } from '@/components/hub/people';

export const metadata: Metadata = { title: 'Hub clients' };

export default function Page() {
  return <HubClientsPage />;
}
