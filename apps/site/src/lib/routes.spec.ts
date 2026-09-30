import { alternatesFor } from './metadata';
import { pricingRedirect } from './routes';
import { contentSecurityPolicy } from './security-headers';

const redirect = (path: string, query = '') => pricingRedirect(path, new URLSearchParams(query));

describe('pricingRedirect', () => {
  it('turns ?country= into the country page', () => {
    expect(redirect('/en/pricing', 'country=ae')).toBe('/en/pricing/ae');
    expect(redirect('/ur/pricing/', 'country=EG')).toBe('/ur/pricing/eg');
  });

  it('leaves everything else alone', () => {
    expect(redirect('/en/pricing')).toBeNull();
    expect(redirect('/en/pricing', 'country=fr')).toBeNull();
    expect(redirect('/en/pricing/pk', 'country=ae')).toBeNull();
    expect(redirect('/fr/pricing', 'country=ae')).toBeNull();
    expect(redirect('/en/faq', 'country=ae')).toBeNull();
  });
});

describe('alternatesFor', () => {
  it('links every language and points x-default to English', () => {
    expect(alternatesFor('ar', '/pricing/pk')).toEqual({
      canonical: '/ar/pricing/pk',
      languages: {
        en: '/en/pricing/pk',
        ar: '/ar/pricing/pk',
        ur: '/ur/pricing/pk',
        'x-default': '/en/pricing/pk',
      },
    });
  });
});

describe('contentSecurityPolicy', () => {
  const production = contentSecurityPolicy({
    apiUrl: 'https://api.example.com/some/path',
    dev: false,
    upgradeInsecureRequests: true,
  });

  it('only allows our own scripts, styles and fonts, and fetches to the API', () => {
    expect(production).toContain("default-src 'self'");
    expect(production).toContain("script-src 'self' 'unsafe-inline';");
    expect(production).toContain("style-src 'self';");
    expect(production).toContain("connect-src 'self' https://api.example.com;");
    expect(production).toContain("frame-ancestors 'none'");
    expect(production).toContain("object-src 'none'");
    expect(production).toContain('upgrade-insecure-requests');
    expect(production).not.toContain('unsafe-eval');
  });

  it('relaxes only what development needs', () => {
    const dev = contentSecurityPolicy({
      apiUrl: 'http://localhost:3000',
      dev: true,
      upgradeInsecureRequests: false,
    });
    expect(dev).toContain("'unsafe-eval'");
    expect(dev).toContain("style-src 'self' 'unsafe-inline'");
    expect(dev).not.toContain('upgrade-insecure-requests');
  });
});
