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
    key: 'mentor_approval_for_certificates',
    description:
      'A module certificate needs a mentor to approve the module project first (premium students).',
    enabled: true,
  },
  {
    key: 'under_13_accounts',
    description:
      'Allow child accounts for ages 9–12, in countries with at least one verified parental consent method (Admin → Countries). Switch on per country once the lawyer approves its methods.',
  },
  {
    key: 'hub_payouts',
    description:
      'Send hub earnings to parents (Wise, or recorded by hand) and record payments to lead developers. Switch on only once the lawyer has signed off the hub agreements and payouts (Gate 2). Batches can be prepared and approved while it is off.',
  },
];
