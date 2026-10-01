import { PREVIEW_MAX_FILE_BYTES, PREVIEW_MAX_FILES, previewFiles } from './deliveries.service.js';

describe('previewFiles', () => {
  it('keeps static site files, in a fixed order, and skips hidden folders and packages', () => {
    const files = previewFiles([
      { path: 'style.css', size: 10 },
      { path: 'index.html', size: 20 },
      { path: 'README.md', size: 5 },
      { path: '.env', size: 5 },
      { path: '.github/ci.yml', size: 5 },
      { path: 'node_modules/x/index.js', size: 5 },
      { path: 'img/Logo.PNG', size: 50 },
      { path: 'server.py', size: 5 },
      { path: 'big.js', size: PREVIEW_MAX_FILE_BYTES + 1 },
    ]);
    expect(files).toEqual([
      { path: 'README.md', size: 5, type: 'text/plain' },
      { path: 'img/Logo.PNG', size: 50, type: 'image/png' },
      { path: 'index.html', size: 20, type: 'text/html' },
      { path: 'style.css', size: 10, type: 'text/css' },
    ]);
  });

  it('stops at the limits', () => {
    const many = Array.from({ length: PREVIEW_MAX_FILES + 5 }, (_, i) => ({
      path: `p/${String(i).padStart(4, '0')}.html`,
      size: 1,
    }));
    expect(previewFiles(many)).toHaveLength(PREVIEW_MAX_FILES);
    const heavy = Array.from({ length: 8 }, (_, i) => ({ path: `${i}.png`, size: 1024 * 1024 }));
    expect(previewFiles(heavy)).toHaveLength(5);
  });
});
