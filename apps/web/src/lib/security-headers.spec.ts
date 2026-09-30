import { contentSecurityPolicy, securityHeaders } from './security-headers';

const options = {
  apiUrl: 'https://api.example.com/v1',
  sandboxUrl: 'https://sandbox.example-usercontent.com/',
  dev: false,
};

describe('security headers', () => {
  it('lets the page talk only to itself, the API and the sandbox', () => {
    const csp = contentSecurityPolicy(options);
    expect(csp).toContain(
      "connect-src 'self' https://api.example.com https://sandbox.example-usercontent.com;",
    );
    expect(csp).toContain(
      'frame-src https://sandbox.example-usercontent.com https://www.youtube-nocookie.com',
    );
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain('upgrade-insecure-requests');
    expect(csp).not.toContain('unsafe-eval');
  });

  it('allows eval only in development, and no https upgrade on localhost', () => {
    const csp = contentSecurityPolicy({
      apiUrl: 'http://localhost:3000',
      sandboxUrl: 'http://localhost:3004',
      dev: true,
    });
    expect(csp).toContain("'unsafe-eval'");
    expect(csp).not.toContain('upgrade-insecure-requests');
  });

  it('sends HSTS and the other hardening headers', () => {
    const keys = securityHeaders(options).map((h) => h.key);
    expect(keys).toEqual(
      expect.arrayContaining([
        'Content-Security-Policy',
        'Strict-Transport-Security',
        'X-Frame-Options',
        'X-Content-Type-Options',
      ]),
    );
  });
});
