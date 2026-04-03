import { parseCrdYaml, parseCrdFile } from "./crd-parser.js";
import { extractSchemas } from "./schema-extractor.js";
import { generateResourceCall } from "./factory-generator.js";
import { buildModuleContent, emitGeneratedCode } from "./code-emitter.js";
import type { GeneratedCode, ExtractedSchema } from "./types.js";

const processSchema = (schema: ExtractedSchema): GeneratedCode => {
  const resourceCall = generateResourceCall(schema);
  const fullModule = buildModuleContent(resourceCall);

  return {
    group: schema.group,
    version: schema.version,
    kind: schema.kind,
    fullModule,
  };
};

export const generateFromYaml = (
  yamlContent: string,
): readonly GeneratedCode[] => {
  const crds = parseCrdYaml(yamlContent);
  const schemas = crds.flatMap(extractSchemas);
  return schemas.map(processSchema);
};

export const generateFromFile = async (
  filePath: string,
): Promise<readonly GeneratedCode[]> => {
  const crds = await parseCrdFile(filePath);
  const schemas = crds.flatMap(extractSchemas);
  return schemas.map(processSchema);
};

export const generateAndEmit = async (
  inputPaths: readonly string[],
  outputDir: string,
): Promise<readonly string[]> => {
  const allCodes = await Promise.all(inputPaths.map(generateFromFile));
  return emitGeneratedCode(outputDir, allCodes.flat());
};
