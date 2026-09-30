import { confirmResult, joinResult } from './api';
import { validateWaitlist } from './validation';

describe('validateWaitlist', () => {
  const valid = { email: 'parent@example.com', countryCode: 'EG', ageBand: 'AGE_13_16' };

  it('accepts a complete form', () => {
    expect(validateWaitlist(valid)).toEqual({});
    expect(validateWaitlist({ ...valid, email: '  parent@example.com ' })).toEqual({});
  });

  it('says what is missing or wrong', () => {
    expect(validateWaitlist({ email: '', countryCode: '', ageBand: '' })).toEqual({
      email: 'emailRequired',
      countryCode: 'countryRequired',
      ageBand: 'ageRequired',
    });
    expect(validateWaitlist({ ...valid, email: 'parent@example' }).email).toBe('emailInvalid');
    expect(validateWaitlist({ ...valid, email: 'a b@example.com' }).email).toBe('emailInvalid');
    expect(validateWaitlist({ ...valid, countryCode: 'FR' }).countryCode).toBe('countryRequired');
    expect(validateWaitlist({ ...valid, ageBand: 'AGE_5_8' }).ageBand).toBe('ageRequired');
  });
});

describe('API answers', () => {
  it('maps the waitlist answer to what the parent sees', () => {
    expect(joinResult(202)).toBe('sent');
    expect(joinResult(429)).toBe('tooMany');
    expect(joinResult(400)).toBe('invalid');
    expect(joinResult(500)).toBe('failed');
    expect(joinResult(503)).toBe('failed');
  });

  it('maps the confirmation answer', () => {
    expect(confirmResult(200)).toBe('confirmed');
    expect(confirmResult(204)).toBe('confirmed');
    expect(confirmResult(410)).toBe('expired');
    expect(confirmResult(404)).toBe('expired');
    expect(confirmResult(500)).toBe('failed');
    expect(confirmResult(429)).toBe('failed');
  });
});
