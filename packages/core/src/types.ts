/**
 * ---
 * purpose: Defines the supported OpenAPI document shape consumed by every Speccy surface.
 * related:
 *   - ./model.ts - Converts these loose document types into display-ready data.
 *   - ../../renderer/src/types.ts - Adds the React-facing renderer configuration.
 * ---
 */

export type HttpMethod =
  'get' | 'post' | 'put' | 'patch' | 'delete' | 'options' | 'head' | 'trace';

export interface SpecificationExtensions {
  'x-internal'?: boolean;
  [key: `x-${string}`]: unknown;
}

export interface OpenAPIDocument {
  openapi?: string;
  swagger?: string;
  jsonSchemaDialect?: string;
  info?: {
    title?: string;
    summary?: string;
    version?: string;
    description?: string;
    termsOfService?: string;
    contact?: { name?: string; url?: string; email?: string };
    license?: { name?: string; identifier?: string; url?: string };
    'x-icon'?: { url?: string; alt?: string };
  };
  servers?: ServerObject[];
  externalDocs?: ExternalDocumentationObject;
  host?: string;
  basePath?: string;
  schemes?: string[];
  consumes?: string[];
  produces?: string[];
  tags?: Array<{
    name?: string;
    description?: string;
    externalDocs?: ExternalDocumentationObject;
    'x-longDescription'?: string;
    'x-icon'?: { url?: string; alt?: string };
  }>;
  'x-tagGroups'?: Array<{ name?: string; tags?: string[] }>;
  paths?: Record<string, PathItem>;
  webhooks?: Record<string, PathItem>;
  security?: SecurityRequirement[];
  definitions?: Record<string, Schema>;
  parameters?: Record<string, Parameter>;
  responses?: Record<string, ResponseObject>;
  securityDefinitions?: Record<string, SecurityScheme>;
  components?: {
    schemas?: Record<string, Schema>;
    parameters?: Record<string, Parameter>;
    requestBodies?: Record<string, RequestBody>;
    responses?: Record<string, ResponseObject>;
    headers?: Record<string, HeaderObject>;
    examples?: Record<string, ExampleObject>;
    links?: Record<string, LinkObject>;
    callbacks?: Record<string, CallbackObject>;
    pathItems?: Record<string, PathItem>;
    securitySchemes?: Record<string, SecurityScheme>;
  };
  [key: string]: unknown;
}

export interface ExternalDocumentationObject extends SpecificationExtensions {
  description?: string;
  url?: string;
}

export interface ServerVariableObject extends SpecificationExtensions {
  default?: string;
  enum?: string[];
  description?: string;
}

export interface ServerObject extends SpecificationExtensions {
  url?: string;
  description?: string;
  variables?: Record<string, ServerVariableObject>;
}

export interface PathItem extends Partial<Record<HttpMethod, Operation>> {
  $ref?: string;
  parameters?: Parameter[];
  summary?: string;
  description?: string;
  servers?: ServerObject[];
  [key: string]: unknown;
}

export interface Operation extends SpecificationExtensions {
  tags?: string[];
  'x-tagSubgroup'?: string;
  'x-speccy-prerequisites'?: OperationReference[];
  'x-speccy-lifecycle'?: OperationLifecycle | (string & {});
  summary?: string;
  description?: string;
  operationId?: string;
  deprecated?: boolean;
  externalDocs?: ExternalDocumentationObject;
  servers?: ServerObject[];
  parameters?: Parameter[];
  requestBody?: RequestBody;
  responses?: Record<string, ResponseObject>;
  callbacks?: Record<string, CallbackObject>;
  security?: SecurityRequirement[];
  consumes?: string[];
  produces?: string[];
}

export type OperationLifecycle = 'new' | 'coming-soon' | 'beta';

export type OperationReference =
  | string
  | {
      operationId?: string;
      operationRef?: string;
      description?: string;
    };

export type SecurityRequirement = Record<string, string[]>;

export interface Parameter extends SpecificationExtensions {
  name?: string;
  in?: string;
  description?: string;
  required?: boolean;
  deprecated?: boolean;
  allowEmptyValue?: boolean;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
  schema?: Schema;
  content?: Record<string, MediaType>;
  type?: string;
  format?: string;
  items?: Schema;
  enum?: unknown[];
  collectionFormat?: string;
  example?: unknown;
  examples?: Record<string, ExampleObject>;
  $ref?: string;
}

export interface RequestBody extends SpecificationExtensions {
  description?: string;
  required?: boolean;
  content?: Record<string, MediaType>;
  $ref?: string;
}

export interface ResponseObject extends SpecificationExtensions {
  description?: string;
  headers?: Record<string, HeaderObject>;
  content?: Record<string, MediaType>;
  schema?: Schema;
  examples?: Record<string, unknown>;
  links?: Record<string, LinkObject>;
  $ref?: string;
}

export interface MediaType extends SpecificationExtensions {
  schema?: Schema;
  example?: unknown;
  examples?: Record<string, ExampleObject>;
  encoding?: Record<string, EncodingObject>;
}

export interface EncodingObject extends SpecificationExtensions {
  contentType?: string;
  headers?: Record<string, HeaderObject>;
  style?: string;
  explode?: boolean;
  allowReserved?: boolean;
}

export type HeaderObject = Omit<Parameter, 'name' | 'in'>;

export interface ExampleObject extends SpecificationExtensions {
  summary?: string;
  description?: string;
  value?: unknown;
  externalValue?: string;
  $ref?: string;
}

export interface LinkObject extends SpecificationExtensions {
  operationRef?: string;
  operationId?: string;
  parameters?: Record<string, unknown>;
  requestBody?: unknown;
  description?: string;
  server?: ServerObject;
  $ref?: string;
}

export type CallbackObject = Record<string, PathItem> & { $ref?: string };

export interface SecurityScheme extends SpecificationExtensions {
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

export type Schema = boolean | SchemaObject;

export interface SchemaObject extends SpecificationExtensions {
  $schema?: string;
  $id?: string;
  $anchor?: string;
  $dynamicRef?: string;
  $dynamicAnchor?: string;
  $comment?: string;
  type?: string | string[];
  format?: string;
  title?: string;
  description?: string;
  required?: string[];
  $defs?: Record<string, Schema>;
  properties?: Record<string, Schema>;
  patternProperties?: Record<string, Schema>;
  dependentSchemas?: Record<string, Schema>;
  dependentRequired?: Record<string, string[]>;
  propertyNames?: Schema;
  items?: Schema;
  prefixItems?: Schema[];
  contains?: Schema;
  minContains?: number;
  maxContains?: number;
  enum?: unknown[];
  const?: unknown;
  examples?: unknown[];
  example?: unknown;
  default?: unknown;
  nullable?: boolean;
  readOnly?: boolean;
  writeOnly?: boolean;
  deprecated?: boolean;
  discriminator?:
    string | { propertyName?: string; mapping?: Record<string, string> };
  xml?: {
    name?: string;
    namespace?: string;
    prefix?: string;
    attribute?: boolean;
    wrapped?: boolean;
  };
  externalDocs?: ExternalDocumentationObject;
  additionalProperties?: Schema;
  unevaluatedProperties?: Schema;
  unevaluatedItems?: Schema;
  minimum?: number;
  maximum?: number;
  exclusiveMinimum?: number;
  exclusiveMaximum?: number;
  multipleOf?: number;
  minLength?: number;
  maxLength?: number;
  pattern?: string;
  minItems?: number;
  maxItems?: number;
  uniqueItems?: boolean;
  minProperties?: number;
  maxProperties?: number;
  contentEncoding?: string;
  contentMediaType?: string;
  allOf?: Schema[];
  oneOf?: Schema[];
  anyOf?: Schema[];
  not?: Schema;
  if?: Schema;
  then?: Schema;
  else?: Schema;
  $ref?: string;
  [key: string]: unknown;
}
