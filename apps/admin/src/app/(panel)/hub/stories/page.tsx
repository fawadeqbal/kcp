import type { Metadata } from 'next';
import { HubStoriesPage } from '@/components/hub/stories';

export const metadata: Metadata = { title: 'Stories' };

export default function Page() {
  return <HubStoriesPage />;
}
