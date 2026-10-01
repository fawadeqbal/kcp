import type { Metadata } from 'next';
import { HubProjectsPage } from '@/components/hub/projects';

export const metadata: Metadata = { title: 'Hub projects' };

export default function Page() {
  return <HubProjectsPage />;
}
