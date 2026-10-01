import type { Metadata } from 'next';
import { MentorsPage } from '@/components/mentors';

export const metadata: Metadata = { title: 'Mentors and tutors' };

export default function Page() {
  return <MentorsPage />;
}
