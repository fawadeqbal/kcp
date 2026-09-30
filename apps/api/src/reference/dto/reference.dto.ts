export class LanguageDto {
  /** e.g. "ur" */
  code!: string;
  /** English name, e.g. "Urdu" */
  name!: string;
  /** Name in the language itself, e.g. "اردو" */
  nativeName!: string;
  direction!: 'LTR' | 'RTL';
}

export class CountryDto {
  /** ISO 3166-1 alpha-2, e.g. "PK" */
  code!: string;
  /** Names by language code, e.g. { "en": "Pakistan", "ur": "پاکستان" } */
  names!: Record<string, string>;
  currency!: string;
  timezone!: string;
  defaultLanguageCode!: string;
}

export class CityDto {
  id!: string;
  slug!: string;
  names!: Record<string, string>;
}

export class RegionDto {
  id!: string;
  slug!: string;
  names!: Record<string, string>;
  cities!: CityDto[];
}
