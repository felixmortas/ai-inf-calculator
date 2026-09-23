import { describe, expect, it } from 'vitest';
import viteConfig from '../vite.config';

describe('configuration de publication', () => {
  it('conserve la base statique du calculateur', () => {
    expect(viteConfig.base).toBe('/ai-inf-calculator/');
  });
});
