import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateFromYaml } from "../src/pipeline.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures");
const readFixture = (name: string) =>
  readFileSync(resolve(FIXTURE_DIR, name), "utf-8");

describe("generateFromYaml", () => {
  it("should generate code for a namespaced CRD", async () => {
    const yaml = readFixture("sample-crd.yaml");
    const codes = await generateFromYaml(yaml);

    expect(codes).toHaveLength(1);
    expect(codes[0].group).toBe("cert-manager.io");
    expect(codes[0].version).toBe("v1");
    expect(codes[0].kind).toBe("Certificate");
  });

  it("should produce fullModule with imports, types, opts, and factory", async () => {
    const yaml = readFixture("sample-crd.yaml");
    const codes = await generateFromYaml(yaml);
    const mod = codes[0].fullModule;

    expect(mod).toContain('import { resource, type ResourceManifest }');
    expect(mod).toContain("export interface CertificateSpec");
    expect(mod).toContain("export interface CertificateOpts");
    expect(mod).toContain("export function certificate(");
  });

  it("should generate for multiple served versions", async () => {
    const yaml = readFixture("multi-version-crd.yaml");
    const codes = await generateFromYaml(yaml);

    expect(codes).toHaveLength(2);
    const versions = codes.map((c) => c.version).sort();
    expect(versions).toEqual(["v1", "v1alpha1"]);
  });

  it("should handle cluster-scoped CRD", async () => {
    const yaml = readFixture("cluster-scoped-crd.yaml");
    const codes = await generateFromYaml(yaml);
    const mod = codes[0].fullModule;

    expect(mod).toContain("resourceClusterScope");
    expect(mod).toContain("ClusterScopedResourceManifest");
    expect(mod).not.toContain("namespace");
  });

  it("should produce valid TypeScript types with descriptions", async () => {
    const yaml = readFixture("sample-crd.yaml");
    const codes = await generateFromYaml(yaml);
    const types = codes[0].types;

    expect(types).toContain("Name of the Secret resource");
    expect(types).toContain("DNS names for the certificate");
  });
});
