import type { JSONSchema, CrdDocument, ExtractedSchema } from "./types.js";

const NON_TOP_LEVEL_FIELDS = new Set([
  "apiVersion",
  "kind",
  "metadata",
  "spec",
  "status",
]);

const extractPropertySchema = (
  fullSchema: JSONSchema,
  property: string,
): JSONSchema | undefined => {
  const prop = fullSchema.properties?.[property];
  if (!prop || typeof prop === "boolean") return undefined;
  return prop as JSONSchema;
};

const extractTopLevelSchema = (
  fullSchema: JSONSchema,
): JSONSchema | undefined => {
  const entries = Object.entries(fullSchema.properties ?? {}).filter(
    ([key]) => !NON_TOP_LEVEL_FIELDS.has(key),
  );
  if (entries.length === 0) return undefined;

  const keys = new Set(entries.map(([key]) => key));
  const required = (fullSchema.required ?? []).filter((key) => keys.has(key));
  return {
    type: "object",
    properties: Object.fromEntries(entries),
    ...(required.length ? { required } : {}),
  };
};

const extractOneVersion = (
  crd: CrdDocument,
  version: (typeof crd.spec.versions)[number],
): ExtractedSchema | undefined => {
  const fullSchema = version.schema?.openAPIV3Schema;
  if (!fullSchema) return undefined;

  return {
    group: crd.spec.group,
    kind: crd.spec.names.kind,
    version: version.name,
    scope: crd.spec.scope,
    plural: crd.spec.names.plural,
    shortNames: crd.spec.names.shortNames ?? [],
    specSchema: extractPropertySchema(fullSchema, "spec"),
    statusSchema: extractPropertySchema(fullSchema, "status"),
    topLevelSchema: extractTopLevelSchema(fullSchema),
    fullSchema,
  };
};

export const extractSchemas = (
  crd: CrdDocument,
): readonly ExtractedSchema[] =>
  crd.spec.versions
    .filter((v) => v.served)
    .map((v) => extractOneVersion(crd, v))
    .filter((s): s is ExtractedSchema => s !== undefined);
