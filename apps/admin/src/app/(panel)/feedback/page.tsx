import type { Metadata } from 'next';
import { Suspense } from 'react';
import { FeedbackList } from '@/components/feedback-list';

export const metadata: Metadata = { title: 'Feedback' };

export default function FeedbackPage() {
  return (
    <Suspense>
      <FeedbackList />
    </Suspense>
  );
}
