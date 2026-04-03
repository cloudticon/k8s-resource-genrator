import type { ExtractedSchema } from "./types.js";
import { generateObjectShape } from "./type-generator.js";

const toFactoryName = (kind: string): string =>
  kind.charAt(0).toLowerCase() + kind.slice(1);

export const generateResourceCall = (schema: ExtractedSchema): string => {
  const fnName = toFactoryName(schema.kind);
  const apiVersion = `${schema.group}/${schema.version}`;
  const specShape = schema.specSchema
    ? generateObjectShape(schema.specSchema)
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
    `  spec: ${specShape},`,
    ...(statusShape ? [`  status: ${statusShape},`] : []),
    `});`,
  ];

  return lines.join("\n");
};
