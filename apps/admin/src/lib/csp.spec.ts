import { adminContentSecurityPolicy } from './csp';

describe('admin Content-Security-Policy', () => {
  it('runs only scripts with this request’s nonce, and talks only to the API', () => {
    const csp = adminContentSecurityPolicy({
      nonce: 'abc123',
      apiUrl: 'https://api.example.com',
      webAppUrl: 'https://app.example.com',
      dev: false,
    });
    expect(csp).toContain("script-src 'self' 'nonce-abc123' 'strict-dynamic';");
    expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
    expect(csp).toContain("connect-src 'self' https://api.example.com;");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
  });
});
