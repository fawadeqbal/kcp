import type { Metadata } from 'next';
import { SchoolDetailPage } from '@/components/schools';

export const metadata: Metadata = { title: 'School' };

export default async function SchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <SchoolDetailPage id={id} />;
}
