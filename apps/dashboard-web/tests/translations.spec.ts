import { describe, expect, it } from 'vitest';
import ar from '../src/messages/ar.json';
import en from '../src/messages/en.json';
describe('foundation translations', () => {
  it('supplies both languages with identical nonempty keys', () => {
    expect(Object.keys(ar.Foundation).sort()).toEqual(
      Object.keys(en.Foundation).sort(),
    );
    for (const messages of [ar.Foundation, en.Foundation]) {
      for (const value of Object.values(messages))
        expect(value.trim().length).toBeGreaterThan(0);
    }
  });
  it('uses localized application names', () => {
    expect(ar.Foundation.title).not.toBe(en.Foundation.title);
  });
});
