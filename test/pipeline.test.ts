import { describe, it, expect } from "vitest";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { generateFromYaml } from "../src/pipeline.js";
import { emitGeneratedCode } from "../src/code-emitter.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures");
const readFixture = (name: string) =>
  readFileSync(resolve(FIXTURE_DIR, name), "utf-8");

describe("generateFromYaml", () => {
  it("should generate code for a namespaced CRD", () => {
    const yaml = readFixture("sample-crd.yaml");
    const codes = generateFromYaml(yaml);

    expect(codes).toHaveLength(1);
    expect(codes[0].group).toBe("cert-manager.io");
    expect(codes[0].version).toBe("v1");
    expect(codes[0].kind).toBe("Certificate");
  });

  it("should produce fullModule with import and resource() call", () => {
    const yaml = readFixture("sample-crd.yaml");
    const codes = generateFromYaml(yaml);
    const mod = codes[0].fullModule;

    expect(mod).toContain(
      'import { resource, z } from "https://github.com/cloudticon/k8s@master"',
    );
    expect(mod).toContain("export const certificate = resource(");
    expect(mod).toContain("z.string()");
    expect(mod).toContain("z.object(");
  });

  it("should generate for multiple served versions", () => {
    const yaml = readFixture("multi-version-crd.yaml");
    const codes = generateFromYaml(yaml);

    expect(codes).toHaveLength(2);
    const versions = codes.map((c) => c.version).sort();
    expect(versions).toEqual(["v1", "v1alpha1"]);
  });

  it("should handle cluster-scoped CRD", () => {
    const yaml = readFixture("cluster-scoped-crd.yaml");
    const codes = generateFromYaml(yaml);
    const mod = codes[0].fullModule;

    expect(mod).toContain('scope: "Cluster"');
    expect(mod).toContain("export const clusterIssuer = resource(");
  });

  it("should include enum values in z.enum() calls", () => {
    const yaml = readFixture("sample-crd.yaml");
    const codes = generateFromYaml(yaml);
    const mod = codes[0].fullModule;

    expect(mod).toContain('z.enum(["Issuer","ClusterIssuer"])');
  });

  it("should include status schema when present", () => {
    const yaml = readFixture("status-crd.yaml");
    const codes = generateFromYaml(yaml);
    const mod = codes[0].fullModule;

    expect(mod).toContain("status:");
    expect(mod).toContain("ready: z.boolean()");
  });

  it("should include shortNames when present", () => {
    const yaml = readFixture("short-names-crd.yaml");
    const codes = generateFromYaml(yaml);
    const mod = codes[0].fullModule;

    expect(mod).toContain('shortNames: ["cert","certs"]');
  });

  it("should generate a spec-less core kind with topLevel fields", () => {
    const yaml = readFixture("core-configmap.yaml");
    const codes = generateFromYaml(yaml);
    const mod = codes[0].fullModule;

    expect(mod).toContain('export const configMap = resource("v1", "ConfigMap"');
    expect(mod).toContain("topLevel: {");
    expect(mod).not.toContain("spec:");
  });
});

describe("emitGeneratedCode", () => {
  it("should write core group (named or empty) files under core/", async () => {
    const outDir = mkdtempSync(join(tmpdir(), "crd2ts-"));
    const codes = [
      { group: "core", version: "v1", kind: "ConfigMap", fullModule: "" },
      { group: "", version: "v2", kind: "Thing", fullModule: "" },
    ];

    const written = await emitGeneratedCode(outDir, codes);

    expect(written).toEqual([
      join(outDir, "core", "v1.ts"),
      join(outDir, "core", "v2.ts"),
    ]);
  });
});
