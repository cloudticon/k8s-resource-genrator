import yaml from "js-yaml";
import { readFile } from "node:fs/promises";
import type { CrdDocument } from "./types.js";

const isCrd = (doc: unknown): doc is CrdDocument =>
  typeof doc === "object" &&
  doc !== null &&
  (doc as Record<string, unknown>).kind === "CustomResourceDefinition" &&
  typeof (doc as Record<string, unknown>).spec === "object";

export const parseCrdYaml = (content: string): readonly CrdDocument[] => {
  const docs = yaml.loadAll(content);
  return docs.filter(isCrd);
};

export const parseCrdFile = async (
  filePath: string,
): Promise<readonly CrdDocument[]> => {
  const content = await readFile(filePath, "utf-8");
  return parseCrdYaml(content);
};
