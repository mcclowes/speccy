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

export function schemaTypeLabel(schema?: Schema): string {
  if (schema === undefined || schema === true) return 'any';
  if (schema === false) return 'never';
  if (schema.$ref) return schema.$ref.split('/').pop() ?? 'reference';
  return schema.type === 'array'
    ? `array<${schemaTypeLabel(schema.items)}>`
    : schema.enum
      ? 'enum'
      : [schema.type ?? 'object', schema.format].filter(Boolean).join(' · ');
}

export function schemaLabel(schema?: Schema): string {
  return [
    typeof schema === 'object' ? schema.title : undefined,
    schemaTypeLabel(schema),
  ]
    .filter(Boolean)
    .join(' · ');
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

  return {
    ...base,
    type: base.type ?? members.find((member) => member.type)?.type,
    properties,
    required,
  };
}

/** Unwraps one more level so an array-of-array field still exposes its leaf properties. */
function childProperties(schema: SchemaObject): Record<string, Schema> {
  return structuralObjectSchema(schema).properties ?? {};
}

function propertyExample(value: unknown, name: string): unknown {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    return undefined;
  return (value as Record<string, unknown>)[name];
}

export function fieldChildren(field: ExplorerField): ExplorerField[] {
  const structuralSchema = structuralObjectSchema(field.schema);
  const required = structuralSchema.required;
  return Object.entries(childProperties(structuralSchema)).map(
    ([name, schema]) => ({
      name,
      schema,
      required: required?.includes(name) ?? false,
      path: [...field.path, name],
      exampleValue: propertyExample(field.exampleValue, name),
    }),
  );
}

/** Root examples may be a collection, in which case the first item stands in for the shape. */
export function rootFields(
  structuralSchema: SchemaObject,
  exampleValue: unknown,
): ExplorerField[] {
  const sample = Array.isArray(exampleValue) ? exampleValue[0] : exampleValue;
  return Object.entries(structuralSchema.properties ?? {}).map(
    ([name, schema]) => ({
      name,
      schema,
      required: structuralSchema.required?.includes(name) ?? false,
      path: [name],
      exampleValue: propertyExample(sample, name),
    }),
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
  ];
}
