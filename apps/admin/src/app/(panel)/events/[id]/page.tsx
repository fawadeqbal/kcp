import type { Metadata } from 'next';
import { EventDetailPage } from '@/components/events';

export const metadata: Metadata = { title: 'Hackathon' };

export default async function EventPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <EventDetailPage id={id} />;
}
