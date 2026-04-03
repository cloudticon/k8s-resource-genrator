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

const buildFilePath = (outputDir: string, code: GeneratedCode): string => {
  const groupDir = code.group.replace(/\./g, "-");
  return join(outputDir, groupDir, `${code.version}.ts`);
};

const deduplicateImports = (codes: readonly GeneratedCode[]): string => {
  const namespacedSymbols = new Set<string>();
  const clusterSymbols = new Set<string>();

  for (const c of codes) {
    if (c.fullModule.includes("resourceClusterScope")) {
      clusterSymbols.add("resourceClusterScope");
      clusterSymbols.add("type ClusterScopedResourceManifest");
    }
    if (/\bresource\b/.test(c.fullModule) && !c.fullModule.includes("resourceClusterScope")) {
      namespacedSymbols.add("resource");
      namespacedSymbols.add("type ResourceManifest");
    }
  }

  const allSymbols = [...namespacedSymbols, ...clusterSymbols];
  if (allSymbols.length === 0) return "";

  return `import { ${allSymbols.join(", ")} } from "@cloudticon/ct-k8s-resources";`;
};

const stripImportLines = (module: string): string =>
  module
    .split("\n")
    .filter((line) => !line.startsWith("import "))
    .join("\n")
    .replace(/^\n+/, "");

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
    const imports = deduplicateImports(groupCodes);
    const bodies = groupCodes.map((c) => stripImportLines(c.fullModule));

    const content = [BANNER, imports, "", ...bodies].join("\n");

    await mkdir(dirname(filePath), { recursive: true });
    await writeFile(filePath, content, "utf-8");
    writtenPaths.push(filePath);
  }

  return writtenPaths;
};

export const buildModuleContent = (
  imports: string,
  types: string,
  optsInterface: string,
  factory: string,
): string =>
  [imports, "", types, optsInterface, "", factory, ""].join("\n");
