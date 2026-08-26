/**
 * ---
 * purpose: Derives the display facts SchemaView needs from a schema object so each view renders straight-line.
 * related:
 *   - ./SchemaView.tsx - Renders root and named-field schema views from this model.
 *   - ./schemaExplorerModel.ts - Owns the interactive explorer's own, differently-labelled model.
 * ---
 */

import type { Schema, SchemaObject } from 'speccy-core';
import {
  discriminatorModel,
  rootFields,
  structuralObjectSchema,
  unsupportedByExplorer,
} from './schemaExplorerModel';

export interface SchemaConstraint {
  label: string;
  value: unknown;
}

export interface SchemaViewModel {
  properties: Record<string, Schema>;
  alternatives?: Schema[];
  discriminator: ReturnType<typeof discriminatorModel>;
  isObject: boolean;
  enumValues?: unknown[];
  constraints: SchemaConstraint[];
  applicators: Array<[string, Schema]>;
  /** The supplied example is a scalar (or null) that can be shown inline. */
  scalarExample: boolean;
  /** No example was supplied, so the schema's own example stands in. */
  inlineExample: boolean;
}

export function alternativeName(schema: Schema, index: number): string {
  if (typeof schema === 'boolean') return schema ? 'Any value' : 'No value';
  if (!schema.title) return `Option ${index + 1}`;
  return schema.title
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
}

export function schemaFromExample(value: unknown): SchemaObject {
  if (Array.isArray(value)) {
    return {
      type: 'array',
      items: value.length > 0 ? schemaFromExample(value[0]) : {},
    };
  }
  if (value !== null && typeof value === 'object') {
    return {
      type: 'object',
      properties: Object.fromEntries(
        Object.entries(value).map(([name, fieldValue]) => [
          name,
          schemaFromExample(fieldValue),
        ]),
      ),
    };
  }
  if (value === null) return { nullable: true };
  return { type: typeof value };
}

/**
 * The schema the interactive explorer should render, or undefined when the explorer
 * cannot represent this schema. An example only stands in for a schema that describes no
 * shape of its own; borrowing its keys for a composed schema would present one branch as
 * if it were the whole contract.
 */
export function explorableSchema(
  schema: SchemaObject,
  exampleValue: unknown,
): SchemaObject | undefined {
  if (schema.xml || schema.externalDocs) return undefined;
  const explorerSchema = structuralObjectSchema(schema);
  const exampleSchema =
    exampleValue !== null &&
    typeof exampleValue === 'object' &&
    !Array.isArray(exampleValue)
      ? schemaFromExample(exampleValue)
      : undefined;
  const schemaWithExampleFields =
    Object.keys(explorerSchema.properties ?? {}).length === 0 &&
    exampleSchema &&
    !explorerSchema.oneOf &&
    !explorerSchema.anyOf &&
    explorerSchema.additionalProperties === undefined &&
    !explorerSchema.patternProperties
      ? { ...schema, properties: exampleSchema.properties }
      : schema;
  const displayExplorerSchema = structuralObjectSchema(schemaWithExampleFields);
  if (
    unsupportedByExplorer(displayExplorerSchema) ||
    rootFields(displayExplorerSchema, exampleValue).length === 0
  )
    return undefined;
  return schemaWithExampleFields;
}

function schemaConstraints(schema: SchemaObject): SchemaConstraint[] {
  const constraints: SchemaConstraint[] = [];
  const push = (label: string, value: unknown) =>
    constraints.push({ label, value });
  if (schema.minimum !== undefined) push('min', schema.minimum);
  if (schema.maximum !== undefined) push('max', schema.maximum);
  if (schema.exclusiveMinimum !== undefined)
    push('exclusive min', schema.exclusiveMinimum);
  if (schema.exclusiveMaximum !== undefined)
    push('exclusive max', schema.exclusiveMaximum);
  if (schema.multipleOf !== undefined) push('multiple of', schema.multipleOf);
  if (schema.minLength !== undefined) push('min length', schema.minLength);
  if (schema.maxLength !== undefined) push('max length', schema.maxLength);
  if (schema.pattern) push('pattern', schema.pattern);
  if (schema.minItems !== undefined) push('min items', schema.minItems);
  if (schema.maxItems !== undefined) push('max items', schema.maxItems);
  if (schema.minContains !== undefined)
    push('min contains', schema.minContains);
  if (schema.maxContains !== undefined)
    push('max contains', schema.maxContains);
  if (schema.uniqueItems !== undefined)
    push('unique items', schema.uniqueItems);
  if (schema.minProperties !== undefined)
    push('min properties', schema.minProperties);
  if (schema.maxProperties !== undefined)
    push('max properties', schema.maxProperties);
  if (schema.dependentRequired)
    push('dependent required', schema.dependentRequired);
  if (schema.additionalProperties === false)
    push('additional properties', 'not allowed');
  if (schema.const !== undefined) push('const', schema.const);
  if (schema.contentEncoding) push('content encoding', schema.contentEncoding);
  if (schema.contentMediaType)
    push('content media type', schema.contentMediaType);
  for (const [label, value] of [
    ['schema dialect', schema.$schema],
    ['schema id', schema.$id],
    ['anchor', schema.$anchor],
    ['dynamic anchor', schema.$dynamicAnchor],
    ['dynamic reference', schema.$dynamicRef],
  ] as const) {
    if (value) push(label, value);
  }
  return constraints;
}

function schemaApplicators(schema: SchemaObject): Array<[string, Schema]> {
  const single = (label: string, value: Schema | undefined) =>
    value === undefined ? [] : ([[label, value]] as Array<[string, Schema]>);
  return [
    ...Object.entries(schema.$defs ?? {}).map(
      ([definition, value]) =>
        [`Definition ${definition}`, value] as [string, Schema],
    ),
    ...(schema.prefixItems ?? []).map(
      (item, index) => [`Prefix item ${index + 1}`, item] as [string, Schema],
    ),
    ...single('Contains', schema.contains),
    ...Object.entries(schema.patternProperties ?? {}).map(
      ([pattern, value]) => [`Pattern ${pattern}`, value] as [string, Schema],
    ),
    ...Object.entries(schema.dependentSchemas ?? {}).map(
      ([property, value]) =>
        [`Depends on ${property}`, value] as [string, Schema],
    ),
    ...single('Property names', schema.propertyNames),
    ...single('If', schema.if),
    ...single('Then', schema.then),
    ...single('Else', schema.else),
    ...single('Not', schema.not),
    ...single('Unevaluated properties', schema.unevaluatedProperties),
    ...single('Unevaluated items', schema.unevaluatedItems),
  ];
}

export function schemaViewModel(
  schema: SchemaObject,
  exampleValue: unknown,
  showExample: boolean,
): SchemaViewModel {
  const properties = schema.properties ?? {};
  return {
    properties,
    alternatives: schema.oneOf ?? schema.anyOf,
    discriminator: discriminatorModel(schema),
    isObject: schema.type === 'object' || Object.keys(properties).length > 0,
    enumValues:
      schema.enum ??
      (schema.type === 'array' && typeof schema.items === 'object'
        ? schema.items.enum
        : undefined),
    constraints: schemaConstraints(schema),
    applicators: schemaApplicators(schema),
    scalarExample:
      exampleValue !== undefined &&
      (exampleValue === null || typeof exampleValue !== 'object'),
    inlineExample:
      exampleValue === undefined && showExample && schema.example !== undefined,
  };
}
