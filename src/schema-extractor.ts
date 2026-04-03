import type { JSONSchema, CrdDocument, ExtractedSchema } from "./types.js";

const extractPropertySchema = (
  fullSchema: JSONSchema,
  property: string,
): JSONSchema | undefined => {
  const prop = fullSchema.properties?.[property];
  if (!prop || typeof prop === "boolean") return undefined;
  return prop as JSONSchema;
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
