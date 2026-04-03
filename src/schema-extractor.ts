import type { JSONSchema } from "json-schema-to-typescript";
import type { CrdDocument, ExtractedSchema } from "./types.js";

const extractSpecSchema = (
  fullSchema: JSONSchema,
): JSONSchema | undefined => {
  const specProp = fullSchema.properties?.["spec"];
  if (!specProp || typeof specProp === "boolean") return undefined;
  return specProp as JSONSchema;
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
    specSchema: extractSpecSchema(fullSchema),
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
