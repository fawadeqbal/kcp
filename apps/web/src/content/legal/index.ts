import type { Locale } from '@kcp/i18n';
import { TERMS_UPDATED } from '@kcp/shared';
import { privacy } from './privacy';
import { safety } from './safety';
import { terms } from './terms';

export type LegalDoc = 'safety' | 'terms' | 'privacy';

/**
 * Shown as "Last updated" on each page. The terms and privacy policy share a version
 * (TERMS_VERSION in packages/shared): parents accept both together.
 */
export const LEGAL_UPDATED: Record<LegalDoc, string> = {
  safety: '2026-10-01',
  terms: TERMS_UPDATED,
  privacy: TERMS_UPDATED,
};

export const legalTexts: Record<LegalDoc, Record<Locale, string>> = { safety, terms, privacy };
