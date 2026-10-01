import type { Metadata } from 'next';
import { EventsList } from '@/components/events';

export const metadata: Metadata = { title: 'Hackathons' };

export default function EventsPage() {
  return <EventsList />;
}
