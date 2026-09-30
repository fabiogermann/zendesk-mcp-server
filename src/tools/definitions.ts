import type * as z from 'zod/v4';
import type { Namespace } from '../config';

export interface ToolAnnotations {
  readOnlyHint: boolean;
  destructiveHint: boolean;
  idempotentHint: boolean;
  openWorldHint: boolean;
}

export interface ToolTextContent {
  type: 'text';
  text: string;
}
export interface ToolImageContent {
  type: 'image';
  data: string;
  mimeType: string;
}

export interface ToolResult {
  [key: string]: unknown;
  content: Array<ToolTextContent | ToolImageContent>;
}

export interface ToolDefinition {
  name: string;
  namespace: Namespace;
  readOnly: boolean;
  title: string;
  description: string;
  inputSchema: z.ZodObject;
  annotations: ToolAnnotations;
  handler: (params: Record<string, unknown>) => Promise<ToolResult>;
}

export interface ToolContext {
  subdomain: string;
  /**
   * Deploy-time brand lock (multi-brand accounts): Help Center operations are
   * restricted to this brand, and a per-call `brand_id` naming any other brand
   * is rejected. Unset = account default brand, per-call selection allowed.
   * Only the help_center namespace reads it; Support-side tools are account-wide.
   * `| undefined` so callers can spread config.brandId straight in under
   * exactOptionalPropertyTypes.
   */
  brandId?: number | undefined;
  /**
   * Resolves a brand id to the host its Help Center is served on
   * (`host_mapping` ?? `<brand.subdomain>.zendesk.com`), cached. Zendesk
   * addresses brands by host, so every brand-scoped Help Center call goes
   * through here first. Only ever invoked when a brand is actually selected.
   */
  resolveBrandHost: (brandId: number) => Promise<string>;
  getToken: () => string | Promise<string>;
}
