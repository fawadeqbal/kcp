import type { Metadata } from 'next';
import { ContentList } from '@/components/content';

export const metadata: Metadata = { title: 'Content' };

export default function ContentPage() {
  return <ContentList />;
}
