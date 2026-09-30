import type { Metadata } from 'next';
import { Leaderboards } from '@/components/leaderboards';

export const metadata: Metadata = { title: 'Leaderboards' };

export default function LeaderboardsPage() {
  return <Leaderboards />;
}
