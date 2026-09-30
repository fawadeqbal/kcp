import { ipNetwork } from './rate-limit.decorator.js';

describe('ipNetwork', () => {
  it('keeps IPv4 addresses as they are, also when mapped into IPv6', () => {
    expect(ipNetwork('203.0.113.7')).toBe('203.0.113.7');
    expect(ipNetwork('::ffff:203.0.113.7')).toBe('203.0.113.7');
  });

  it('counts IPv6 addresses by their /64', () => {
    expect(ipNetwork('2001:db8:1234:5678:aaaa:bbbb:cccc:dddd')).toBe('2001:db8:1234:5678::/64');
    expect(ipNetwork('2001:0db8:1234:5678::1')).toBe('2001:db8:1234:5678::/64');
    expect(ipNetwork('2001:db8::1')).toBe('2001:db8:0:0::/64');
    expect(ipNetwork('::1')).toBe('0:0:0:0::/64');
    expect(ipNetwork(undefined)).toBeUndefined();
  });
});
