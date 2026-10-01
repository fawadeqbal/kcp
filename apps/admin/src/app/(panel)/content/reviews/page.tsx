import type { Metadata } from 'next';
import { StudioReviews } from '@/components/content-studio';

export const metadata: Metadata = { title: 'Waiting for review' };

export default function ReviewsPage() {
  return <StudioReviews />;
}
