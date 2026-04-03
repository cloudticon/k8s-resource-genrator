#!/usr/bin/env node

import { Command } from "commander";
import { resolve } from "node:path";
import { readdir, stat } from "node:fs/promises";
import { generateAndEmit } from "./pipeline.js";

const collectYamlFiles = async (inputPath: string): Promise<string[]> => {
  const info = await stat(inputPath);

  if (info.isFile()) return [inputPath];

  if (info.isDirectory()) {
    const entries = await readdir(inputPath, { recursive: true });
    return entries
      .filter((e) => /\.(ya?ml)$/i.test(e))
      .map((e) => resolve(inputPath, e));
  }

  return [];
};

const run = async (): Promise<void> => {
  const program = new Command()
    .name("crd2ts")
    .description(
      "Generate TypeScript types and factory functions from Kubernetes CRD files",
    )
    .argument("<input>", "Path to CRD YAML file or directory containing CRDs")
    .option("-o, --output <dir>", "Output directory", "./generated")
    .parse(process.argv);

  const inputPath = resolve(program.args[0]);
  const outputDir = resolve(program.opts().output as string);

  console.log(`Scanning: ${inputPath}`);
  const files = await collectYamlFiles(inputPath);

  if (files.length === 0) {
    console.error("No YAML files found.");
    process.exit(1);
  }

  console.log(`Found ${files.length} CRD file(s)`);

  const written = await generateAndEmit(files, outputDir);

  for (const p of written) {
    console.log(`  Written: ${p}`);
  }

  console.log("Done.");
};

run().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
