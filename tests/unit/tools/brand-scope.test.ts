import { describe, expect, it } from 'vitest';
import { resolveBrandId } from '../../../src/tools/help-center';

describe('resolveBrandId', () => {
  it('defaults to the account default brand when neither is set', () => {
    expect(resolveBrandId(undefined, undefined)).toBeUndefined();
  });

  it('uses the per-call brand when no lock is configured', () => {
    expect(resolveBrandId(111, undefined)).toBe(111);
  });

  it('uses the deploy lock when no per-call brand is given', () => {
    expect(resolveBrandId(undefined, 222)).toBe(222);
  });

  it('lets a per-call brand equal to the lock pass through', () => {
    expect(resolveBrandId(222, 222)).toBe(222);
  });

  it('rejects a per-call brand that disagrees with the deploy lock', () => {
    expect(() => resolveBrandId(111, 222)).toThrow('--brand-id');
  });
});
