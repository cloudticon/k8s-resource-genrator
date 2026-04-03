import { compile } from "json-schema-to-typescript";
import type { JSONSchema } from "json-schema-to-typescript";
import type { ExtractedSchema } from "./types.js";

const COMPILE_OPTIONS = {
  bannerComment: "",
  additionalProperties: false,
  unknownAny: true,
  strictIndexSignatures: false,
  unreachableDefinitions: true,
  format: true,
  style: {
    semi: true,
    singleQuote: false,
    tabWidth: 2,
    trailingComma: "all" as const,
    printWidth: 100,
  },
} as const;

const patchXKubernetesFields = (schema: JSONSchema): JSONSchema => {
  const cloned = JSON.parse(JSON.stringify(schema)) as Record<string, unknown>;

  const walk = (node: Record<string, unknown>): void => {
    for (const key of Object.keys(node)) {
      if (key.startsWith("x-kubernetes-")) {
        delete node[key];
      }
      const val = node[key];
      if (val && typeof val === "object" && !Array.isArray(val)) {
        walk(val as Record<string, unknown>);
      }
      if (Array.isArray(val)) {
        for (const item of val) {
          if (item && typeof item === "object") {
            walk(item as Record<string, unknown>);
          }
        }
      }
    }
  };

  walk(cloned);
  return cloned as JSONSchema;
};

export const generateSpecType = async (
  schema: ExtractedSchema,
): Promise<string> => {
  if (!schema.specSchema) return "";

  const cleaned = patchXKubernetesFields(schema.specSchema);
  const typeName = `${schema.kind}Spec`;

  return compile(cleaned, typeName, COMPILE_OPTIONS);
};

export const generateFullType = async (
  schema: ExtractedSchema,
): Promise<string> => {
  const cleaned = patchXKubernetesFields(schema.fullSchema);
  const typeName = schema.kind;

  return compile(cleaned, typeName, COMPILE_OPTIONS);
};
