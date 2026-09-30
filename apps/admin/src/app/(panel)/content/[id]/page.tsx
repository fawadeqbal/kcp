import type { Metadata } from 'next';
import { ContentPreview } from '@/components/content';

export const metadata: Metadata = { title: 'Content preview' };

export default async function ContentPreviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ContentPreview id={id} />;
}
