import { pageFrom, readFilters, toQueryString } from './query';

describe('list filters in the URL', () => {
  it('leaves out empty filters and the first page', () => {
    expect(toQueryString({ search: 'kid', status: '', page: '1' })).toBe('?search=kid');
    expect(toQueryString({ page: '3' })).toBe('?page=3');
    expect(toQueryString({})).toBe('');
  });

  it('reads filters back, trimmed', () => {
    const params = new URLSearchParams('search=%20otter%20&role=parent');
    expect(readFilters(params, ['search', 'role', 'status'])).toEqual({
      search: 'otter',
      role: 'parent',
      status: '',
    });
  });

  it('ignores page numbers that make no sense', () => {
    expect(pageFrom(new URLSearchParams('page=4'))).toBe(4);
    expect(pageFrom(new URLSearchParams('page=0'))).toBe(1);
    expect(pageFrom(new URLSearchParams('page=abc'))).toBe(1);
    expect(pageFrom(new URLSearchParams(''))).toBe(1);
  });
});
