import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { generateFromYaml } from "../src/pipeline.js";

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
});
