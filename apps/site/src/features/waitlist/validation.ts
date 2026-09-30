import { type CountryCode, isCountryCode } from '@/lib/countries';
import { AGE_BANDS, type AgeBand } from './api';

export interface WaitlistInput {
  email: string;
  countryCode: string;
  ageBand: string;
}

/** Message keys (namespace "waitlist") for each field that needs fixing. */
export interface WaitlistErrors {
  email?: 'emailRequired' | 'emailInvalid';
  countryCode?: 'countryRequired';
  ageBand?: 'ageRequired';
}

// Something@something.something, without spaces. The API does the real check.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function validateWaitlist(input: WaitlistInput): WaitlistErrors {
  const errors: WaitlistErrors = {};
  const email = input.email.trim();
  if (!email) errors.email = 'emailRequired';
  else if (email.length > 254 || !EMAIL.test(email)) errors.email = 'emailInvalid';
  if (!isCountryCode(input.countryCode)) errors.countryCode = 'countryRequired';
  if (!(AGE_BANDS as readonly string[]).includes(input.ageBand)) errors.ageBand = 'ageRequired';
  return errors;
}

export function isValid(
  input: WaitlistInput,
  errors: WaitlistErrors,
): input is WaitlistInput & { countryCode: CountryCode; ageBand: AgeBand } {
  return Object.keys(errors).length === 0;
}
