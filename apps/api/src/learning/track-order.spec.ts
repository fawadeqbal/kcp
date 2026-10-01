import { orderForAge } from './learning.service.js';

describe('orderForAge', () => {
  const tracks = [
    { id: 'explorer', ageFrom: 9, ageTo: 12 },
    { id: 'builder', ageFrom: null, ageTo: null },
    { id: 'pro', ageFrom: 13, ageTo: 16 },
  ];
  const ids = (age: number | null) => orderForAge(tracks, age).map((track) => track.id);

  it("puts the tracks made for the student's age first", () => {
    expect(ids(10)).toEqual(['explorer', 'builder', 'pro']);
    expect(ids(14)).toEqual(['pro', 'builder', 'explorer']);
  });

  it('keeps the usual order without an age (parents and staff)', () => {
    expect(ids(null)).toEqual(['explorer', 'builder', 'pro']);
  });
});
