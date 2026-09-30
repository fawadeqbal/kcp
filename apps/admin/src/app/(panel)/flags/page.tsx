import type { Metadata } from 'next';
import { FeatureFlags } from '@/components/feature-flags';

export const metadata: Metadata = { title: 'Feature flags' };

export default function FlagsPage() {
  return <FeatureFlags />;
}
