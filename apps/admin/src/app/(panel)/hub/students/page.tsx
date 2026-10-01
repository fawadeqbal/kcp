import type { Metadata } from 'next';
import { HubStudentsPage } from '@/components/hub/people';

export const metadata: Metadata = { title: 'Hub students' };

export default function Page() {
  return <HubStudentsPage />;
}
