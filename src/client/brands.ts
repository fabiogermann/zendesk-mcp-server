import { zendeskGet } from './zendesk-api';

/**
 * Brand id → the host its Help Center is served on. Zendesk addresses brands
 * by host, not by an id in the path: a brand's Guide lives at
 * `https://<host>/api/v2/help_center` where host is the brand's
 * `host_mapping` (a custom domain) when set, else `<brand.subdomain>.zendesk.com`.
 * Resolved once per (subdomain, brand id) and cached: brands change their host
 * almost never, and every Help Center tool call would otherwise pay a
 * `GET /api/v2/brands/{id}` round-trip first.
 */
export type BrandHostResolver = (brandId: number) => Promise<string>;

export const createBrandHostResolver = (
  subdomain: string,
  getToken: () => string | Promise<string>,
): BrandHostResolver => {
  const cache = new Map<number, Promise<string>>();
  return (brandId) => {
    const hit = cache.get(brandId);
    if (hit) return hit;
    const pending = (async () => {
      const token = await getToken();
      const { brand } = await zendeskGet<{
        brand: { host_mapping: string | null; subdomain: string };
      }>(subdomain, token, `/brands/${brandId}`);
      return brand.host_mapping ?? `${brand.subdomain}.zendesk.com`;
    })();
    // A rejection is evicted so the next call retries with a fresh token
    // rather than caching a transient 401/5xx forever.
    pending.catch(() => cache.delete(brandId));
    cache.set(brandId, pending);
    return pending;
  };
};
