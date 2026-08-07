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
  host?: string;
  basePath?: string;
  schemes?: string[];
  consumes?: string[];
  produces?: string[];
  tags?: Array<{ name?: string; description?: string; 'x-longDescription'?: string }>;
  'x-tagGroups'?: Array<{ name?: string; tags?: string[] }>;
  paths?: Record<string, PathItem>;
  webhooks?: Record<string, PathItem>;
  security?: SecurityRequirement[];
  definitions?: Record<string, SchemaObject>;
  parameters?: Record<string, Parameter>;
  responses?: Record<string, ResponseObject>;
  securityDefinitions?: Record<string, SecurityScheme>;
  components?: {
    schemas?: Record<string, SchemaObject>;
    parameters?: Record<string, Parameter>;
    requestBodies?: Record<string, RequestBody>;
    responses?: Record<string, ResponseObject>;
    headers?: Record<string, HeaderObject>;
    examples?: Record<string, ExampleObject>;
    links?: Record<string, LinkObject>;
    callbacks?: Record<string, CallbackObject>;
    securitySchemes?: Record<string, SecurityScheme>;
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
  callbacks?: Record<string, CallbackObject>;
  security?: SecurityRequirement[];
  consumes?: string[];
  produces?: string[];
}

export type SecurityRequirement = Record<string, string[]>;

export interface Parameter {
  name?: string;
  in?: string;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  schema?: SchemaObject;
  type?: string;
  format?: string;
  items?: SchemaObject;
  enum?: unknown[];
  collectionFormat?: string;
  example?: unknown;
  $ref?: string;
}

export interface RequestBody {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaType>;
  $ref?: string;
}

export interface ResponseObject {
  description?: string;
  headers?: Record<string, HeaderObject>;
  content?: Record<string, MediaType>;
  schema?: SchemaObject;
  examples?: Record<string, unknown>;
  links?: Record<string, LinkObject>;
  $ref?: string;
}

export interface MediaType {
  schema?: SchemaObject;
  example?: unknown;
  examples?: Record<string, ExampleObject>;
  encoding?: Record<string, Record<string, unknown>>;
}

export interface HeaderObject extends Omit<Parameter, 'name' | 'in'> {}

export interface ExampleObject {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
  $ref?: string;
}

export interface LinkObject {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, unknown>;
  requestBody?: unknown;
  description?: string;
  server?: { url?: string; description?: string };
  $ref?: string;
}

export type CallbackObject = Record<string, PathItem> & { $ref?: string };

export interface SecurityScheme {
  type?: string;
  description?: string;
  name?: string;
  in?: string;
  scheme?: string;
  bearerFormat?: string;
  openIdConnectUrl?: string;
  flows?: Record<string, OAuthFlow>;
  flow?: string;
  authorizationUrl?: string;
  tokenUrl?: string;
  scopes?: Record<string, string>;
  $ref?: string;
}

export interface OAuthFlow {
  authorizationUrl?: string;
  tokenUrl?: string;
  refreshUrl?: string;
  scopes?: Record<string, string>;
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
  discriminator?: string | { propertyName?: string; mapping?: Record<string, string> };
  additionalProperties?: boolean | SchemaObject;
  minimum?: number;
  maximum?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
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
  /** PROTOTYPE: temporary query parameter layout shown by the standalone studio. */
  parameterPrototypeVariant?: 'A' | 'B' | 'C';
}
