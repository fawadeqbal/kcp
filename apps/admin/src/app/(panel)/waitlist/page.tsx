import type { Metadata } from 'next';
import { WaitlistSummary } from '@/components/waitlist';

export const metadata: Metadata = { title: 'Waitlist' };

export default function WaitlistPage() {
  return <WaitlistSummary />;
}
