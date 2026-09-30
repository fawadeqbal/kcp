/**
 * Feature flags: switched on and off (per country if needed) in Admin → Feature flags.
 * Add a flag here only together with the code that reads it.
 */
export const featureFlags = [
  {
    key: 'payments',
    description:
      'Families can buy plans (card checkout). Premium lessons stay locked without a trial, plan or grant either way.',
    enabled: true,
  },
  {
    key: 'under_13_accounts',
    description:
      'Allow child accounts for ages 9–12. Keep off until the lawyer-approved parental consent method ships (Phase 2).',
  },
];
