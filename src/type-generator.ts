import type { JSONSchema } from "./types.js";

const INDENT = "  ";

export const resolveAllOf = (schema: JSONSchema): JSONSchema => {
  if (!schema.allOf) return schema;

  const { allOf, ...base } = schema;
  const merged: Record<string, unknown> = { ...base };

  for (const item of allOf) {
    const resolved = resolveAllOf(item);
    if (resolved.type && !merged.type) merged.type = resolved.type;
    if (resolved.format && !merged.format) merged.format = resolved.format;
    if (resolved.properties) {
      merged.properties = {
        ...(merged.properties as Record<string, JSONSchema> | undefined),
        ...resolved.properties,
      };
    }
    if (resolved.required) {
      const existing = (merged.required as readonly string[]) ?? [];
      merged.required = [...existing, ...resolved.required];
    }
    if (resolved.items && !merged.items) merged.items = resolved.items;
    if (resolved.additionalProperties !== undefined && !merged.additionalProperties)
      merged.additionalProperties = resolved.additionalProperties;
    if (resolved.enum && !merged.enum) merged.enum = resolved.enum;
    if (resolved.description && !merged.description)
      merged.description = resolved.description;
    if (resolved.default !== undefined && merged.default === undefined)
      merged.default = resolved.default;
  }

  return merged as JSONSchema;
};

const inferType = (schema: JSONSchema): string | undefined => {
  if (schema.type) return schema.type;
  if (schema.properties) return "object";
  if (schema.items) return "array";
  if (schema.additionalProperties) return "object";
  if (schema.enum) return "string";
  return undefined;
};

const chain = (base: string, schema: JSONSchema, required: boolean): string => {
  if (schema.default !== undefined)
    return `${base}.default(${JSON.stringify(schema.default)})`;
  if (!required) return `${base}.optional()`;
  return base;
};

export const openAPIToZ = (
  rawSchema: JSONSchema,
  required = true,
  depth = 0,
): string => {
  const schema = resolveAllOf(rawSchema);

  if (schema.format === "int-or-string")
    return chain("z.string()", schema, required);

  if (schema.enum)
    return chain(`z.enum(${JSON.stringify(schema.enum)})`, schema, required);

  const type = inferType(schema);

  switch (type) {
    case "string":
      return chain("z.string()", schema, required);
    case "integer":
    case "number":
      return chain("z.number()", schema, required);
    case "boolean":
      return chain("z.boolean()", schema, required);
    case "array":
      if (schema.items)
        return chain(
          `z.array(${openAPIToZ(schema.items, true, depth)})`,
          schema,
          required,
        );
      return chain("z.array(z.string())", schema, required);
    case "object": {
      if (schema.properties) {
        const pad = INDENT.repeat(depth);
        const innerPad = INDENT.repeat(depth + 1);
        const fields = Object.entries(schema.properties).map(
          ([k, v]) =>
            `${innerPad}${k}: ${openAPIToZ(v, schema.required?.includes(k) ?? false, depth + 1)},`,
        );
        return chain(
          `z.object({\n${fields.join("\n")}\n${pad}})`,
          schema,
          required,
        );
      }
      if (
        schema.additionalProperties &&
        typeof schema.additionalProperties === "object"
      )
        return chain(
          `z.record(${openAPIToZ(schema.additionalProperties, true, depth)})`,
          schema,
          required,
        );
      return chain("z.record(z.string())", schema, required);
    }
    default:
      return chain("z.string()", schema, required);
  }
};

export const generateObjectShape = (
  rawSchema: JSONSchema,
  baseDepth = 2,
): string => {
  const schema = resolveAllOf(rawSchema);
  if (!schema.properties) return "{}";

  const pad = INDENT.repeat(baseDepth);
  const closePad = INDENT.repeat(baseDepth - 1);
  const fields = Object.entries(schema.properties).map(([k, v]) => {
    const isReq = schema.required?.includes(k) ?? false;
    return `${pad}${k}: ${openAPIToZ(v, isReq, baseDepth)},`;
  });

  return `{\n${fields.join("\n")}\n${closePad}}`;
};
