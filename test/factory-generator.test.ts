import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCrdYaml } from "../src/crd-parser.js";
import { extractSchemas } from "../src/schema-extractor.js";
import { generateResourceCall } from "../src/factory-generator.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures");

const getSchema = (name: string, idx = 0) => {
  const yaml = readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
  const crds = parseCrdYaml(yaml);
  return extractSchemas(crds[0])[idx];
};

describe("generateResourceCall", () => {
  it("should generate resource() call for namespaced CRD", () => {
    const schema = getSchema("sample-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain(
      'export const certificate = resource("cert-manager.io/v1", "Certificate"',
    );
    expect(result).toContain('scope: "Namespaced"');
    expect(result).toContain("spec:");
    expect(result).toContain("z.string()");
  });

  it("should generate resource() call for cluster-scoped CRD", () => {
    const schema = getSchema("cluster-scoped-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain(
      'export const clusterIssuer = resource("cert-manager.io/v1", "ClusterIssuer"',
    );
    expect(result).toContain('scope: "Cluster"');
  });

  it("should use lowercase first letter for variable name", () => {
    const schema = getSchema("multi-version-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain("export const widget = resource(");
  });

  it("should include spec schema as z.* calls", () => {
    const schema = getSchema("sample-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain("secretName: z.string(),");
    expect(result).toContain("z.object(");
    expect(result).toContain("z.array(");
  });

  it("should mark required and optional fields correctly", () => {
    const schema = getSchema("sample-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain("secretName: z.string(),");
    expect(result).toContain("duration: z.string().optional(),");
    expect(result).toContain("isCA: z.boolean().optional(),");
  });

  it("should include enum types", () => {
    const schema = getSchema("sample-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain('z.enum(["Issuer","ClusterIssuer"])');
  });

  it("should include nested object schemas", () => {
    const schema = getSchema("sample-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain("issuerRef: z.object({");
    expect(result).toContain("name: z.string(),");
  });

  it("should include shortNames when present", () => {
    const schema = getSchema("short-names-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain('shortNames: ["cert","certs"]');
  });

  it("should omit shortNames when empty", () => {
    const schema = getSchema("sample-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).not.toContain("shortNames");
  });

  it("should include status schema when present", () => {
    const schema = getSchema("status-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain("status:");
    expect(result).toContain("ready: z.boolean().optional(),");
    expect(result).toContain(
      'phase: z.enum(["Pending","Running","Failed"]).optional(),',
    );
    expect(result).toContain("availableReplicas: z.number().optional(),");
  });

  it("should omit status when not present", () => {
    const schema = getSchema("sample-crd.yaml");
    const result = generateResourceCall(schema);

    const lines = result.split("\n");
    const statusLines = lines.filter((l) => l.trim().startsWith("status:"));
    expect(statusLines).toHaveLength(0);
  });

  it("should handle default values", () => {
    const schema = getSchema("status-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain("replicas: z.number().default(1),");
  });

  it("should handle enum inside array", () => {
    const schema = getSchema("sample-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain("usages: z.array(z.enum(");
  });

  it("should use plain version as apiVersion for the core group", () => {
    const schema = getSchema("core-configmap.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain(
      'export const configMap = resource("v1", "ConfigMap", {',
    );
    expect(result).not.toContain("core/v1");
  });

  it("should treat an empty group as the core group", () => {
    const schema = { ...getSchema("core-configmap.yaml"), group: "" };
    const result = generateResourceCall(schema);

    expect(result).toContain('resource("v1", "ConfigMap"');
  });

  it("should keep group/version for named groups", () => {
    const schema = getSchema("cluster-role-binding.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain(
      'resource("rbac.authorization.k8s.io/v1", "ClusterRoleBinding"',
    );
  });

  it("should put root fields of a kind without spec in topLevel", () => {
    const schema = getSchema("core-configmap.yaml");
    const result = generateResourceCall(schema);

    expect(result).toBe(
      [
        'export const configMap = resource("v1", "ConfigMap", {',
        '  scope: "Namespaced",',
        "  topLevel: {",
        "    binaryData: z.record(z.string()).optional(),",
        "    data: z.record(z.string()).optional(),",
        "    immutable: z.boolean().optional(),",
        "  },",
        "});",
      ].join("\n"),
    );
  });

  it("should keep required root fields required in topLevel", () => {
    const schema = getSchema("cluster-role-binding.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain('scope: "Cluster"');
    expect(result).toContain("  topLevel: {\n    roleRef: z.object({");
    expect(result).toContain("    subjects: z.array(z.object({");
    expect(result).not.toContain("spec:");
  });

  it("should emit both spec and topLevel when a CRD has both", () => {
    const schema = getSchema("top-level-and-spec-crd.yaml");
    const result = generateResourceCall(schema);

    expect(result).toContain(
      "  spec: {\n    target: z.string().optional(),\n  },",
    );
    expect(result).toContain(
      "  topLevel: {\n    data: z.record(z.string()).optional(),\n  },",
    );
    expect(result).toContain("  status: {");
  });

  it("should keep an empty spec when a CRD declares no fields at all", () => {
    const schema = {
      ...getSchema("sample-crd.yaml"),
      specSchema: undefined,
      topLevelSchema: undefined,
    };
    const result = generateResourceCall(schema);

    expect(result).toContain("  spec: {},");
    expect(result).not.toContain("topLevel");
  });
});
