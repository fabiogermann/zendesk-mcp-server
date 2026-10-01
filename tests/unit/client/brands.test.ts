import { HttpResponse, http } from 'msw';
import { describe, expect, it } from 'vitest';
import { createBrandSubdomainResolver } from '../../../src/client/brands';
import { mswServer } from '../../setup';

const SUBDOMAIN = 'testsubdomain';
const TOKEN = 'test-token';

describe('createBrandSubdomainResolver', () => {
  it('resolves a brand id to its subdomain', async () => {
    const resolve = createBrandSubdomainResolver(SUBDOMAIN, () => TOKEN);
    await expect(resolve('424242')).resolves.toBe('brand424242');
  });

  it('resolves a brand subdomain to itself', async () => {
    const resolve = createBrandSubdomainResolver(SUBDOMAIN, () => TOKEN);
    await expect(resolve('brand424242')).resolves.toBe('brand424242');
  });

  it('caches the resolution per id-or-subdomain across calls', async () => {
    let calls = 0;
    mswServer.use(
      http.get('https://testsubdomain.zendesk.com/api/v2/brands', () => {
        calls += 1;
        return HttpResponse.json({
          brands: [
            {
              id: 424242,
              name: 'Second brand',
              brand_url: 'https://brand424242.zendesk.com',
              subdomain: 'brand424242',
              host_mapping: null,
              default: false,
              active: true,
            },
          ],
        });
      }),
    );
    const resolve = createBrandSubdomainResolver(SUBDOMAIN, () => TOKEN);
    await resolve('424242');
    await resolve('424242');
    await resolve('424242');
    expect(calls).toBe(1);
  });

  it('rejects an unknown id or subdomain with a clear error', async () => {
    const resolve = createBrandSubdomainResolver(SUBDOMAIN, () => TOKEN);
    await expect(resolve('999999')).rejects.toThrow(/Unknown brand "999999"/);
    await expect(resolve('nonexistent')).rejects.toThrow(/Unknown brand "nonexistent"/);
  });

  it('follows cursor pagination so brands past the first page resolve', async () => {
    const base = 'https://testsubdomain.zendesk.com/api/v2';
    const seenParams: (string | null)[] = [];
    mswServer.use(
      http.get(`${base}/brands`, ({ request }) => {
        const url = new URL(request.url);
        seenParams.push(url.searchParams.get('page[after]'));
        if (url.searchParams.get('page[after]') === 'cursor2') {
          return HttpResponse.json({
            brands: [
              {
                id: 777777,
                name: 'Third brand',
                brand_url: 'https://brand777777.zendesk.com',
                subdomain: 'brand777777',
                host_mapping: null,
                default: false,
                active: true,
              },
            ],
            meta: { has_more: false, after_cursor: '' },
          });
        }
        return HttpResponse.json({
          brands: [],
          meta: { has_more: true, after_cursor: 'cursor2' },
        });
      }),
    );
    const resolve = createBrandSubdomainResolver(SUBDOMAIN, () => TOKEN);
    await expect(resolve('777777')).resolves.toBe('brand777777');
    // The first page was fetched with no cursor, the second with cursor2.
    expect(seenParams).toEqual([null, 'cursor2']);
  });

  it('treats a page with no brands key as empty', async () => {
    mswServer.use(
      http.get('https://testsubdomain.zendesk.com/api/v2/brands', () =>
        HttpResponse.json({ meta: { has_more: false, after_cursor: '' } }),
      ),
    );
    const resolve = createBrandSubdomainResolver(SUBDOMAIN, () => TOKEN);
    await expect(resolve('424242')).rejects.toThrow(/Unknown brand/);
  });
});
