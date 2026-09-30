/** Languages the apps are available in. The first is the fallback. */
export const LOCALES = ['en', 'ar', 'ur'] as const;
export type Locale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'en';

/** Arabic and Urdu are written right to left; layouts mirror for them. */
export const RTL_LOCALES: readonly Locale[] = ['ar', 'ur'];

/** How each language names itself, for the language switcher. */
export const LOCALE_NAMES: Record<Locale, string> = {
  en: 'English',
  ar: 'العربية',
  ur: 'اردو',
};

export function isLocale(value: string | undefined | null): value is Locale {
  return (LOCALES as readonly string[]).includes(value ?? '');
}

export function directionOf(locale: Locale): 'ltr' | 'rtl' {
  return RTL_LOCALES.includes(locale) ? 'rtl' : 'ltr';
}
