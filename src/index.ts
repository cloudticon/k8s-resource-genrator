export { parseCrdYaml, parseCrdFile } from "./crd-parser.js";
export { extractSchemas } from "./schema-extractor.js";
export { openAPIToZ, generateObjectShape, resolveAllOf } from "./type-generator.js";
export { generateResourceCall } from "./factory-generator.js";
export { emitGeneratedCode, buildModuleContent } from "./code-emitter.js";
export {
  generateFromYaml,
  generateFromFile,
  generateAndEmit,
} from "./pipeline.js";
export type {
  JSONSchema,
  CrdDocument,
  CrdVersion,
  CrdNames,
  CrdSpec,
  ExtractedSchema,
  GeneratedCode,
} from "./types.js";
