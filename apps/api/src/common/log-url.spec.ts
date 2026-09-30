import { logUrl, safePagePath } from './log-url.js';

describe('logUrl', () => {
  it('keeps paths and harmless parameters as they are', () => {
    expect(logUrl('/v1/users/42')).toBe('/v1/users/42');
    expect(logUrl('/v1/users?page=2&role=parent')).toBe('/v1/users?page=2&role=parent');
  });

  it('hides searches, emails and usernames', () => {
    expect(logUrl('/v1/admin/consents?search=parent%40example.com&page=1')).toBe(
      '/v1/admin/consents?search=%5Bredacted%5D&page=1',
    );
    expect(logUrl('/v1/x?Username=brave-otter-1234')).toBe('/v1/x?Username=%5Bredacted%5D');
  });

  it('hides the secret part of shared portfolio links', () => {
    expect(logUrl('/v1/shared/portfolios/AbC-123_xyzAbC-123_xyz?lang=ar')).toBe(
      '/v1/shared/portfolios/[redacted]?lang=ar',
    );
  });

  it('hides share links in web page paths', () => {
    expect(safePagePath('/ar/p/AbC-123_xyzAbC-123_xyz')).toBe('/ar/p/[link]');
    expect(safePagePath('/p/AbC-123_xyzAbC-123_xyz')).toBe('/p/[link]');
    expect(safePagePath('/en/learn/portfolio')).toBe('/en/learn/portfolio');
    expect(safePagePath('/en/projects/p/x')).toBe('/en/projects/p/x');
  });
});
