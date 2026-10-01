import type { Metadata } from 'next';
import { HubCountriesPage } from '@/components/hub/stories';

export const metadata: Metadata = { title: 'Hub country rules' };

export default function Page() {
  return <HubCountriesPage />;
}
