import { mkdir, writeFile } from "node:fs/promises";
import { join, dirname } from "node:path";
import type { GeneratedCode } from "./types.js";

const BANNER = [
  "/* eslint-disable */",
  "/**",
  " * This file was automatically generated from a Kubernetes CRD.",
  " * DO NOT MODIFY IT BY HAND.",
  " */",
  "",
].join("\n");

const IMPORT_LINE =
  'import { resource, z } from "https://github.com/cloudticon/k8s@master";';

const buildFilePath = (outputDir: string, code: GeneratedCode): string => {
  // The core group has an empty name; keep its files under "core/".
  const groupDir = (code.group || "core").replace(/\./g, "-");
  return join(outputDir, groupDir, `${code.version}.ts`);
};

const stripImportLines = (module: string): string =>
  module
    .split("\n")
    .filter((line) => !line.startsWith("import "))
    .join("\n")
    .replace(/^\n+/, "");

export const buildModuleContent = (resourceCall: string): string =>
  [IMPORT_LINE, "", resourceCall, ""].join("\n");

export const emitGeneratedCode = async (
  outputDir: string,
  codes: readonly GeneratedCode[],
): Promise<readonly string[]> => {
  const writtenPaths: string[] = [];

  const grouped = new Map<string, GeneratedCode[]>();
  for (const c of codes) {
    const key = `${c.group}/${c.version}`;
    const arr = grouped.get(key) ?? [];
    arr.push(c);
    grouped.set(key, arr);
  }

  for (const [, groupCodes] of grouped) {
    const filePath = buildFilePath(outputDir, groupCodes[0]);
    const bodies = groupCodes.map((c) => stripImportLines(c.fullModule));
    const content = [BANNER, IMPORT_LINE, "", ...bodies].join("\n");

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
    writtenPaths.push(filePath);
  }

  return writtenPaths;
};
