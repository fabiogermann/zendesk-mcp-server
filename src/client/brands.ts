import type { ZendeskBrand, ZendeskListResponse } from '../types';
import { zendeskGet } from './zendesk-api';

/**
 * Brand id-or-subdomain → the brand's subdomain. Zendesk addresses brands by
 * host, not by an id in the path: a brand's Guide lives at
 * `https://<brand.subdomain>.zendesk.com/api/v2/help_center`. The allow-list
 * (`--brand-ids`) mixes ids and subdomains; both resolve to the subdomain here,
 * once per (account subdomain, id-or-subdomain) and cached: brands change
 * almost never, and every Help Center tool call would otherwise pay a
 * `GET /api/v2/brands` round-trip first.
 */
export type BrandSubdomainResolver = (idOrSubdomain: string) => Promise<string>;

/** Fetch every brand of the account (cursor-paginated). */
const fetchAllBrands = async (subdomain: string, token: string): Promise<ZendeskBrand[]> => {
  // Stryker disable next-line ArrayDeclaration: a seeded array would only add a
  // non-brand entry, which no id/subdomain lookup can match — equivalent.
  const brands: ZendeskBrand[] = [];
  let cursor: string | undefined;
  do {
    const response = await zendeskGet<ZendeskListResponse<ZendeskBrand>>(
      subdomain,
      token,
      '/brands',
      cursor ? { 'page[after]': cursor } : undefined,
    );
    // Stryker disable next-line ArrayDeclaration: same reasoning as the seed
    // above — a junk fallback entry is unresolvable by id or subdomain.
    brands.push(...(response.brands ?? []));
    cursor =
      response.meta?.has_more && response.meta.after_cursor
        ? response.meta.after_cursor
        : undefined;
  } while (cursor);
  return brands;
};

export const createBrandSubdomainResolver = (
  subdomain: string,
  getToken: () => string | Promise<string>,
): BrandSubdomainResolver => {
  // The brand LIST is cached once (one memoised promise), not per id-or-subdomain
  // key: every lookup resolves against the same fetch, so N allow-list entries
  // and any number of distinct brand_ids cost one /brands walk total, not N+1.
  // A rejection is evicted so the next lookup retries with a fresh token rather
  // than caching a transient 401/5xx forever.
  let listPromise: Promise<ZendeskBrand[]> | undefined;
  const brands = (): Promise<ZendeskBrand[]> => {
    if (!listPromise) {
      listPromise = (async () => fetchAllBrands(subdomain, await getToken()))();
      listPromise.catch(() => {
        listPromise = undefined;
      });
    }
    return listPromise;
  };

  return async (idOrSubdomain) => {
    const all = await brands();
    const brand =
      all.find((b) => String(b.id) === idOrSubdomain) ??
      all.find((b) => b.subdomain === idOrSubdomain);
    if (!brand) {
      throw new Error(
        `Unknown brand "${idOrSubdomain}": no brand with that id or subdomain exists on this account. Check --brand-ids / ZENDESK_BRAND_IDS, or call list_brands to see the available brands.`,
      );
    }
    return brand.subdomain;
  };
};
