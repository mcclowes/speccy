/**
 * ---
 * purpose: Derives the field tree, labels, and constraint rows that the schema explorer renders.
 * related:
 *   - ./SchemaExplorer.tsx - Owns the explorer shell and selection state.
 *   - ./SchemaExplorerTree.tsx - Renders these fields as an expandable tree.
 *   - ./SchemaExplorerDetails.tsx - Renders these labels and constraints for one field.
 * ---
 */

import type { Schema, SchemaObject } from 'speccy-core';

export interface ExplorerField {
  name: string;
  schema: Schema;
  required: boolean;
  path: string[];
  exampleValue?: unknown;
}

export interface ExplorerConstraint {
  label: string;
  value: string | number;
}

export type EnumValue = NonNullable<SchemaObject['enum']>[number];

function constTypeName(value: unknown): string | undefined {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  const primitive = typeof value;
  return primitive === 'object' ? 'object' : primitive;
}

/**
 * JSON Schema leaves `type` optional, so the label falls back to whatever the schema's other
 * keywords imply and only says `any` when nothing constrains the value at all.
 */
/** Reports the type shared by every member of a composition, so `oneOf` still reads as one type. */
function composedTypeName(members: Schema[]): string | undefined {
  const names = members.map((member) =>
    typeof member === 'object' ? declaredTypeName(member) : undefined,
  );
  const [first] = names;
  return first && names.every((name) => name === first) ? first : undefined;
}

function declaredTypeName(schema: SchemaObject): string | undefined {
  if (Array.isArray(schema.type)) return schema.type.join(' | ');
  if (schema.type) return schema.type;
  if (schema.const !== undefined) return constTypeName(schema.const);
  if (
    schema.properties ||
    schema.required ||
    schema.additionalProperties !== undefined ||
    schema.patternProperties ||
    schema.propertyNames !== undefined
  )
    return 'object';
  if (schema.items !== undefined || schema.prefixItems) return 'array';
  const members = schema.oneOf ?? schema.anyOf ?? schema.allOf;
  return members ? composedTypeName(members) : undefined;
}

export function schemaTypeLabel(schema?: Schema): string {
  if (schema === undefined || schema === true) return 'any';
  if (schema === false) return 'never';
  if (schema.$ref) return schema.$ref.split('/').pop() ?? 'reference';
  if (schema.allOf) schema = structuralObjectSchema(schema);
  const declaredType = declaredTypeName(schema);
  if (declaredType === 'array')
    return `array<${schemaLabel(schema.items ?? true)}>`;
  if (schema.enum) return 'enum';
  return [declaredType ?? 'any', schema.format].filter(Boolean).join(' · ');
}

export function schemaLabel(schema?: Schema): string {
  return [
    typeof schema === 'object' ? schema.title : undefined,
    schemaTypeLabel(schema),
  ]
    .filter(Boolean)
    .join(' · ');
}

export interface DiscriminatorModel {
  propertyName?: string;
  /** Maps each alternative's index onto the discriminator value that selects it. */
  valueFor: (alternative: Schema, index: number) => string | undefined;
}

/**
 * Mapping targets are `$ref` strings before resolution and inlined schemas after it, so the
 * mapped value is matched back to an alternative by the schema name the resolver preserves.
 */
export function discriminatorModel(
  schema: SchemaObject,
): DiscriminatorModel | undefined {
  const { discriminator } = schema;
  if (!discriminator) return undefined;
  if (typeof discriminator === 'string')
    return { propertyName: discriminator, valueFor: () => undefined };

  const mapping = Object.entries(discriminator.mapping ?? {});
  return {
    propertyName: discriminator.propertyName,
    valueFor: (alternative) => {
      const name =
        typeof alternative === 'object'
          ? (alternative.title ?? alternative.$ref?.split('/').pop())
          : undefined;
      if (!name) return undefined;
      return mapping.find(
        ([, target]) => target === name || target.split('/').pop() === name,
      )?.[0];
    },
  };
}

export function alternativeName(schema: Schema, index: number): string {
  if (typeof schema === 'boolean') return schema ? 'Any value' : 'No value';
  const name = schema.title ?? schema.$ref?.split('/').pop();
  if (!name) return `Option ${index + 1}`;
  return name
    .replace(/([A-Z]+)([A-Z][a-z])/g, '$1 $2')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
}

export function structuralObjectSchema(schema: Schema): SchemaObject {
  if (typeof schema === 'boolean')
    return {
      description: schema ? 'Any value is allowed.' : 'No value is allowed.',
    };
  const base = schema.type === 'array' && schema.items ? schema.items : schema;
  if (typeof base === 'boolean') return structuralObjectSchema(base);
  const members = (base.allOf ?? []).map(structuralObjectSchema);
  if (members.length === 0) return base;

  const properties = Object.assign(
    {},
    ...members.map((member) => member.properties ?? {}),
    base.properties ?? {},
  );
  const required = [
    ...new Set([
      ...members.flatMap((member) => member.required ?? []),
      ...(base.required ?? []),
    ]),
  ];
  const inherited: Partial<SchemaObject> = {};
  const inheritedKeywords = [
    'enum',
    'format',
    'pattern',
    'minimum',
    'maximum',
    'minLength',
    'maxLength',
    'example',
  ] as const satisfies readonly (keyof SchemaObject)[];
  for (const keyword of inheritedKeywords) {
    if (base[keyword] !== undefined) continue;
    const member = members.find(
      (candidate) => candidate[keyword] !== undefined,
    );
    if (member) Object.assign(inherited, { [keyword]: member[keyword] });
  }

  return {
    ...base,
    ...inherited,
    type: base.type ?? members.find((member) => member.type)?.type,
    properties,
    required,
  };
}

/** Unwraps one more level so an array-of-array field still exposes its leaf properties. */
function childProperties(schema: SchemaObject): SchemaObject {
  return structuralObjectSchema(schema);
}

function propertyExample(value: unknown, name: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined;
  return (value as Record<string, unknown>)[name];
}

/**
 * Declared properties come first, then the open-ended shapes — pattern and additional
 * properties — so a map-shaped schema is never reported as having no fields.
 */
function schemaFields(
  schema: SchemaObject,
  basePath: string[],
  sample: unknown,
): ExplorerField[] {
  const declared = Object.entries(schema.properties ?? {}).map(
    ([name, property]) => ({
      name,
      schema: property,
      required: schema.required?.includes(name) ?? false,
      path: [...basePath, name],
      exampleValue: propertyExample(sample, name),
    }),
  );
  const patterned = Object.entries(schema.patternProperties ?? {}).map(
    ([pattern, property]) => ({
      name: pattern,
      schema: property,
      required: false,
      path: [...basePath, pattern],
    }),
  );
  const additional =
    typeof schema.additionalProperties === 'object' &&
    !schema.properties?.additionalProperties
      ? [
          {
            name: 'additionalProperties',
            schema: schema.additionalProperties,
            required: false,
            path: [...basePath, 'additionalProperties'],
          },
        ]
      : [];
  return [...declared, ...patterned, ...additional];
}

export function fieldChildren(field: ExplorerField): ExplorerField[] {
  return schemaFields(
    childProperties(structuralObjectSchema(field.schema)),
    field.path,
    field.exampleValue,
  );
}

/** Root examples may be a collection, in which case the first item stands in for the shape. */
export function rootFields(
  structuralSchema: SchemaObject,
  exampleValue: unknown,
): ExplorerField[] {
  const sample = Array.isArray(exampleValue) ? exampleValue[0] : exampleValue;
  return schemaFields(structuralSchema, [], sample);
}

/**
 * Keywords the explorer's field tree cannot express. Schemas using them fall back to the
 * recursive schema view so nothing is dropped from the rendered reference.
 */
const EXPLORER_BLIND_KEYWORDS = [
  '$defs',
  'contains',
  'dependentSchemas',
  'else',
  'if',
  'not',
  'prefixItems',
  'propertyNames',
  'then',
  'unevaluatedItems',
  'unevaluatedProperties',
] as const;

export function unsupportedByExplorer(schema: SchemaObject): boolean {
  return EXPLORER_BLIND_KEYWORDS.some(
    (keyword) => schema[keyword] !== undefined,
  );
}

export function findExplorerField(
  fields: ExplorerField[],
  path: string[],
): ExplorerField | undefined {
  let level = fields;
  let selected: ExplorerField | undefined;
  for (const segment of path) {
    selected = level.find((field) => field.name === segment);
    if (!selected) return undefined;
    level = fieldChildren(selected);
  }
  return selected;
}

export function enumValues(schema: SchemaObject): EnumValue[] | undefined {
  if (schema.enum) return schema.enum;
  if (schema.const !== undefined) return [schema.const];
  return schema.type === 'array' && typeof schema.items === 'object'
    ? schema.items.enum
    : undefined;
}

function lengthConstraints({
  minLength,
  maxLength,
}: SchemaObject): ExplorerConstraint[] {
  if (minLength !== undefined && minLength === maxLength)
    return [{ label: 'Length', value: `Exactly ${minLength} characters` }];
  return [
    ...(minLength !== undefined
      ? [{ label: 'Length', value: `At least ${minLength} characters` }]
      : []),
    ...(maxLength !== undefined
      ? [{ label: 'Length', value: `At most ${maxLength} characters` }]
      : []),
  ];
}

export function schemaConstraints(schema: SchemaObject): ExplorerConstraint[] {
  return [
    ...(schema.minimum !== undefined
      ? [{ label: 'Minimum', value: schema.minimum }]
      : []),
    ...(schema.maximum !== undefined
      ? [{ label: 'Maximum', value: schema.maximum }]
      : []),
    ...lengthConstraints(schema),
    ...(schema.pattern ? [{ label: 'Pattern', value: schema.pattern }] : []),
    ...(schema.additionalProperties === false
      ? [{ label: 'Properties', value: 'No other properties are allowed' }]
      : []),
  ];
}
