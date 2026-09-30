import type { Metadata } from 'next';
import { Countries } from '@/components/countries';

export const metadata: Metadata = { title: 'Countries and languages' };

export default function CountriesPage() {
  return <Countries />;
}
