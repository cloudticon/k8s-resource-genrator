import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCrdYaml } from "../src/crd-parser.js";
import { extractSchemas } from "../src/schema-extractor.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures");

const loadCrd = (name: string) => {
  const yaml = readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
  return parseCrdYaml(yaml)[0];
};

describe("extractSchemas", () => {
  it("should extract schema from a single-version CRD", () => {
    const crd = loadCrd("sample-crd.yaml");
    const schemas = extractSchemas(crd);

    expect(schemas).toHaveLength(1);
    expect(schemas[0].group).toBe("cert-manager.io");
    expect(schemas[0].kind).toBe("Certificate");
    expect(schemas[0].version).toBe("v1");
    expect(schemas[0].scope).toBe("Namespaced");
    expect(schemas[0].plural).toBe("certificates");
  });

  it("should extract specSchema from CRD", () => {
    const crd = loadCrd("sample-crd.yaml");
    const schemas = extractSchemas(crd);
    const specSchema = schemas[0].specSchema;

    expect(specSchema).toBeDefined();
    expect(specSchema!.type).toBe("object");
    expect(specSchema!.properties).toHaveProperty("secretName");
    expect(specSchema!.properties).toHaveProperty("issuerRef");
    expect(specSchema!.properties).toHaveProperty("dnsNames");
  });

  it("should only extract served versions", () => {
    const crd = loadCrd("multi-version-crd.yaml");
    const schemas = extractSchemas(crd);

    const versionNames = schemas.map((s) => s.version);
    expect(versionNames).toContain("v1");
    expect(versionNames).toContain("v1alpha1");
    expect(versionNames).not.toContain("v2beta1");
  });

  it("should handle cluster-scoped CRD", () => {
    const crd = loadCrd("cluster-scoped-crd.yaml");
    const schemas = extractSchemas(crd);

    expect(schemas).toHaveLength(1);
    expect(schemas[0].scope).toBe("Cluster");
    expect(schemas[0].kind).toBe("ClusterIssuer");
  });

  it("should provide full schema alongside spec schema", () => {
    const crd = loadCrd("sample-crd.yaml");
    const schemas = extractSchemas(crd);

    expect(schemas[0].fullSchema.type).toBe("object");
    expect(schemas[0].fullSchema.properties).toHaveProperty("apiVersion");
    expect(schemas[0].fullSchema.properties).toHaveProperty("spec");
  });

  it("should extract statusSchema from CRD with status", () => {
    const crd = loadCrd("status-crd.yaml");
    const schemas = extractSchemas(crd);

    expect(schemas[0].statusSchema).toBeDefined();
    expect(schemas[0].statusSchema!.type).toBe("object");
    expect(schemas[0].statusSchema!.properties).toHaveProperty("ready");
    expect(schemas[0].statusSchema!.properties).toHaveProperty("phase");
    expect(schemas[0].statusSchema!.properties).toHaveProperty(
      "availableReplicas",
    );
  });

  it("should return undefined statusSchema when not present", () => {
    const crd = loadCrd("sample-crd.yaml");
    const schemas = extractSchemas(crd);

    expect(schemas[0].statusSchema).toBeUndefined();
  });

  it("should extract shortNames from CRD", () => {
    const crd = loadCrd("short-names-crd.yaml");
    const schemas = extractSchemas(crd);

    expect(schemas[0].shortNames).toEqual(["cert", "certs"]);
  });

  it("should provide empty shortNames array when not present", () => {
    const crd = loadCrd("sample-crd.yaml");
    const schemas = extractSchemas(crd);

    expect(schemas[0].shortNames).toEqual([]);
  });
});
