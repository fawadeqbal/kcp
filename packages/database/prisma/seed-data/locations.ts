export type Names = { en: string; ar: string; ur: string };

export interface CitySeed {
  slug: string;
  names: Names;
}

export interface RegionSeed {
  slug: string;
  names: Names;
  cities: CitySeed[];
}

export interface CountrySeed {
  code: string;
  names: Names;
  currency: string;
  timezone: string;
  defaultLanguageCode: string;
  isActive: boolean;
  regions: RegionSeed[];
}

// Pilot candidates from the scope (Pakistan, Egypt, the Gulf). Pakistan and Egypt are
// switched on for development; confirm the real pilot markets and adjust `isActive`.
// Translations of place names should be checked by the language tutors.
export const countries: CountrySeed[] = [
  {
    code: 'PK',
    names: { en: 'Pakistan', ar: 'باكستان', ur: 'پاکستان' },
    currency: 'PKR',
    timezone: 'Asia/Karachi',
    defaultLanguageCode: 'ur',
    isActive: true,
    regions: [
      {
        slug: 'punjab',
        names: { en: 'Punjab', ar: 'البنجاب', ur: 'پنجاب' },
        cities: [
          { slug: 'lahore', names: { en: 'Lahore', ar: 'لاهور', ur: 'لاہور' } },
          { slug: 'rawalpindi', names: { en: 'Rawalpindi', ar: 'راولبندي', ur: 'راولپنڈی' } },
          { slug: 'faisalabad', names: { en: 'Faisalabad', ar: 'فيصل آباد', ur: 'فیصل آباد' } },
        ],
      },
      {
        slug: 'sindh',
        names: { en: 'Sindh', ar: 'السند', ur: 'سندھ' },
        cities: [
          { slug: 'karachi', names: { en: 'Karachi', ar: 'كراتشي', ur: 'کراچی' } },
          { slug: 'hyderabad', names: { en: 'Hyderabad', ar: 'حيدر آباد', ur: 'حیدرآباد' } },
        ],
      },
      {
        slug: 'islamabad-capital-territory',
        names: { en: 'Islamabad Capital Territory', ar: 'إسلام آباد', ur: 'اسلام آباد' },
        cities: [
          { slug: 'islamabad', names: { en: 'Islamabad', ar: 'إسلام آباد', ur: 'اسلام آباد' } },
        ],
      },
      {
        slug: 'khyber-pakhtunkhwa',
        names: { en: 'Khyber Pakhtunkhwa', ar: 'خيبر بختونخوا', ur: 'خیبر پختونخوا' },
        cities: [{ slug: 'peshawar', names: { en: 'Peshawar', ar: 'بيشاور', ur: 'پشاور' } }],
      },
    ],
  },
  {
    code: 'EG',
    names: { en: 'Egypt', ar: 'مصر', ur: 'مصر' },
    currency: 'EGP',
    timezone: 'Africa/Cairo',
    defaultLanguageCode: 'ar',
    isActive: true,
    regions: [
      {
        slug: 'cairo',
        names: { en: 'Cairo Governorate', ar: 'محافظة القاهرة', ur: 'قاہرہ' },
        cities: [{ slug: 'cairo', names: { en: 'Cairo', ar: 'القاهرة', ur: 'قاہرہ' } }],
      },
      {
        slug: 'giza',
        names: { en: 'Giza Governorate', ar: 'محافظة الجيزة', ur: 'جیزہ' },
        cities: [{ slug: 'giza', names: { en: 'Giza', ar: 'الجيزة', ur: 'جیزہ' } }],
      },
      {
        slug: 'alexandria',
        names: { en: 'Alexandria Governorate', ar: 'محافظة الإسكندرية', ur: 'اسکندریہ' },
        cities: [
          { slug: 'alexandria', names: { en: 'Alexandria', ar: 'الإسكندرية', ur: 'اسکندریہ' } },
        ],
      },
    ],
  },
  {
    code: 'AE',
    names: { en: 'United Arab Emirates', ar: 'الإمارات العربية المتحدة', ur: 'متحدہ عرب امارات' },
    currency: 'AED',
    timezone: 'Asia/Dubai',
    defaultLanguageCode: 'ar',
    isActive: false,
    regions: [
      {
        slug: 'dubai',
        names: { en: 'Dubai', ar: 'دبي', ur: 'دبئی' },
        cities: [{ slug: 'dubai', names: { en: 'Dubai', ar: 'دبي', ur: 'دبئی' } }],
      },
      {
        slug: 'abu-dhabi',
        names: { en: 'Abu Dhabi', ar: 'أبوظبي', ur: 'ابوظہبی' },
        cities: [{ slug: 'abu-dhabi', names: { en: 'Abu Dhabi', ar: 'أبوظبي', ur: 'ابوظہبی' } }],
      },
    ],
  },
  {
    code: 'SA',
    names: { en: 'Saudi Arabia', ar: 'المملكة العربية السعودية', ur: 'سعودی عرب' },
    currency: 'SAR',
    timezone: 'Asia/Riyadh',
    defaultLanguageCode: 'ar',
    isActive: false,
    regions: [
      {
        slug: 'riyadh',
        names: { en: 'Riyadh Province', ar: 'منطقة الرياض', ur: 'ریاض' },
        cities: [{ slug: 'riyadh', names: { en: 'Riyadh', ar: 'الرياض', ur: 'ریاض' } }],
      },
      {
        slug: 'makkah',
        names: { en: 'Makkah Province', ar: 'منطقة مكة المكرمة', ur: 'مکہ' },
        cities: [
          { slug: 'jeddah', names: { en: 'Jeddah', ar: 'جدة', ur: 'جدہ' } },
          { slug: 'makkah', names: { en: 'Makkah', ar: 'مكة المكرمة', ur: 'مکہ مکرمہ' } },
        ],
      },
    ],
  },
];
