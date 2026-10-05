import type { ExtractedSchema } from "./types.js";
import { generateObjectShape } from "./type-generator.js";

const toFactoryName = (kind: string): string =>
  kind.charAt(0).toLowerCase() + kind.slice(1);

// The Kubernetes core group has no name: its apiVersion is just "v1".
// "core" is how it is named in paths and generated sources; a real CRD
// group always contains a dot, so it can never collide with it.
const isCoreGroup = (group: string): boolean =>
  group === "" || group === "core";

const toApiVersion = (group: string, version: string): string =>
  isCoreGroup(group) ? version : `${group}/${version}`;

export const generateResourceCall = (schema: ExtractedSchema): string => {
  const fnName = toFactoryName(schema.kind);
  const apiVersion = toApiVersion(schema.group, schema.version);
  const topLevelShape = schema.topLevelSchema
    ? generateObjectShape(schema.topLevelSchema)
    : undefined;
  // Kinds without a spec (ConfigMap, Secret, Role, ...) only get topLevel.
  const specShape = schema.specSchema
    ? generateObjectShape(schema.specSchema)
    : topLevelShape
      ? undefined
      : "{}";
  const statusShape = schema.statusSchema
    ? generateObjectShape(schema.statusSchema)
    : undefined;

  const lines = [
    `export const ${fnName} = resource("${apiVersion}", "${schema.kind}", {`,
    `  scope: "${schema.scope}",`,
    ...(schema.shortNames.length
      ? [`  shortNames: ${JSON.stringify(schema.shortNames)},`]
      : []),
    ...(specShape ? [`  spec: ${specShape},`] : []),
    ...(topLevelShape ? [`  topLevel: ${topLevelShape},`] : []),
    ...(statusShape ? [`  status: ${statusShape},`] : []),
    `});`,
  ];

  return lines.join("\n");
};
