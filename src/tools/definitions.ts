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
   * Restricts Help Center operations to one brand (multi-brand accounts), via
   * the brand-scoped Guide API. Unset targets the account default brand. Only
   * the help_center namespace reads it; Support-side tools are account-wide.
   * `| undefined` so callers can spread config.brandId straight in under
   * exactOptionalPropertyTypes.
   */
  brandId?: number | undefined;
  getToken: () => string | Promise<string>;
}
