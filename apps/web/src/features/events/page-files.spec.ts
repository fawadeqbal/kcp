import { pageFiles } from './page-files';

describe('pageFiles', () => {
  it('drops the page’s own tags for style.css and script.js (the preview inlines them)', () => {
    const files = pageFiles({
      'index.html': [
        '<head><link rel="stylesheet" href="style.css"><link rel=stylesheet href=./style.css />',
        '<link rel="stylesheet" href="https://cdn.example.com/x.css"></head>',
        '<body><h1>Hi</h1><script src="/script.js"></script><script src="other.js"></script></body>',
      ].join(''),
      'style.css': 'h1 { color: green; }',
      'script.js': 'console.log(1);',
    });
    expect(files.html).toBe(
      '<head><link rel="stylesheet" href="https://cdn.example.com/x.css"></head>' +
        '<body><h1>Hi</h1><script src="other.js"></script></body>',
    );
    expect(files.css).toBe('h1 { color: green; }');
    expect(files.js).toBe('console.log(1);');
  });

  it('works with missing files', () => {
    expect(pageFiles({})).toEqual({ html: '', css: '', js: '' });
  });
});
