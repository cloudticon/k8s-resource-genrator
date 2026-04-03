import { parseCrdYaml, parseCrdFile } from "./crd-parser.js";
import { extractSchemas } from "./schema-extractor.js";
import { generateSpecType } from "./type-generator.js";
import {
  generateOptsInterface,
  generateFactory,
  buildImports,
} from "./factory-generator.js";
import { buildModuleContent, emitGeneratedCode } from "./code-emitter.js";
import type { GeneratedCode, ExtractedSchema } from "./types.js";

const processSchema = async (
  schema: ExtractedSchema,
): Promise<GeneratedCode> => {
  const types = await generateSpecType(schema);
  const imports = buildImports(schema);
  const optsInterface = generateOptsInterface(schema);
  const factory = generateFactory(schema);
  const fullModule = buildModuleContent(imports, types, optsInterface, factory);

  return {
    group: schema.group,
    version: schema.version,
    kind: schema.kind,
    types,
    factory,
    fullModule,
  };
};

export const generateFromYaml = async (
  yamlContent: string,
): Promise<readonly GeneratedCode[]> => {
  const crds = parseCrdYaml(yamlContent);
  const schemas = crds.flatMap(extractSchemas);
  return Promise.all(schemas.map(processSchema));
};

export const generateFromFile = async (
  filePath: string,
): Promise<readonly GeneratedCode[]> => {
  const crds = await parseCrdFile(filePath);
  const schemas = crds.flatMap(extractSchemas);
  return Promise.all(schemas.map(processSchema));
};

export const generateAndEmit = async (
  inputPaths: readonly string[],
  outputDir: string,
): Promise<readonly string[]> => {
  const allCodes = await Promise.all(inputPaths.map(generateFromFile));
  return emitGeneratedCode(outputDir, allCodes.flat());
};
