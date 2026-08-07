/**
 * ---
 * purpose: Defines the supported OpenAPI document shape and the renderer's public configuration.
 * related:
 *   - ./model.ts - Converts these loose document types into display-ready data.
 *   - ./Speccy.tsx - Consumes the public renderer configuration.
 * ---
 */

export type HttpMethod =
  | 'get'
  | 'post'
  | 'put'
  | 'patch'
  | 'delete'
  | 'options'
  | 'head'
  | 'trace';

export interface OpenAPIDocument {
  openapi?: string;
  swagger?: string;
  info?: {
    title?: string;
    version?: string;
    description?: string;
    termsOfService?: string;
    contact?: { name?: string; url?: string; email?: string };
    license?: { name?: string; url?: string };
  };
  servers?: Array<{ url?: string; description?: string }>;
  tags?: Array<{ name?: string; description?: string }>;
  paths?: Record<string, PathItem>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    securitySchemes?: Record<string, Record<string, unknown>>;
  };
  [key: string]: unknown;
}

export interface PathItem extends Partial<Record<HttpMethod, Operation>> {
  parameters?: Parameter[];
  summary?: string;
  description?: string;
  [key: string]: unknown;
}

export interface Operation {
  tags?: string[];
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, ResponseObject>;
  security?: Array<Record<string, string[]>>;
}

export interface Parameter {
  name?: string;
  in?: string;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: SchemaObject;
  example?: unknown;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaType>;
}

export interface ResponseObject {
  description?: string;
  headers?: Record<string, unknown>;
  content?: Record<string, MediaType>;
  $ref?: string;
}

export interface MediaType {
  schema?: SchemaObject;
  example?: unknown;
  examples?: Record<string, { value?: unknown }>;
}

export interface SchemaObject {
  type?: string;
  format?: string;
  title?: string;
  description?: string;
  required?: string[];
  properties?: Record<string, SchemaObject>;
  items?: SchemaObject;
  enum?: unknown[];
  example?: unknown;
  default?: unknown;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  allOf?: SchemaObject[];
  oneOf?: SchemaObject[];
  anyOf?: SchemaObject[];
  $ref?: string;
  [key: string]: unknown;
}

export interface SpeccyProps {
  spec: OpenAPIDocument | string;
  className?: string;
  defaultExpanded?: boolean;
  showSidebar?: boolean;
  theme?: 'light' | 'dark' | 'system';
  accentColor?: string;
  logo?: React.ReactNode;
  /** URL prefix for endpoint pages. Each operation is rendered at `${basePath}/${operationId}`. */
  basePath?: string;
  onError?: (error: Error) => void;
}

