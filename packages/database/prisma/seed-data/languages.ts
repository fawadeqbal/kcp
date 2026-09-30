import type { TextDirection } from '../../generated/prisma/client.js';

export interface LanguageSeed {
  code: string;
  name: string;
  nativeName: string;
  direction: TextDirection;
  isActive: boolean;
}

// Launch languages are active; the rest are next candidates from the scope,
// switched on when a local tutor joins.
export const languages: LanguageSeed[] = [
  { code: 'en', name: 'English', nativeName: 'English', direction: 'LTR', isActive: true },
  { code: 'ar', name: 'Arabic', nativeName: 'العربية', direction: 'RTL', isActive: true },
  { code: 'ur', name: 'Urdu', nativeName: 'اردو', direction: 'RTL', isActive: true },
  { code: 'fr', name: 'French', nativeName: 'Français', direction: 'LTR', isActive: false },
  { code: 'tr', name: 'Turkish', nativeName: 'Türkçe', direction: 'LTR', isActive: false },
  {
    code: 'id',
    name: 'Indonesian',
    nativeName: 'Bahasa Indonesia',
    direction: 'LTR',
    isActive: false,
  },
  { code: 'ms', name: 'Malay', nativeName: 'Bahasa Melayu', direction: 'LTR', isActive: false },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', direction: 'LTR', isActive: false },
  { code: 'es', name: 'Spanish', nativeName: 'Español', direction: 'LTR', isActive: false },
  { code: 'pt', name: 'Portuguese', nativeName: 'Português', direction: 'LTR', isActive: false },
];
