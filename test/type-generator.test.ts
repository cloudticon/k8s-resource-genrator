import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCrdYaml } from "../src/crd-parser.js";
import { extractSchemas } from "../src/schema-extractor.js";
import { generateSpecType, generateFullType } from "../src/type-generator.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures");

const getSchema = (name: string, idx = 0) => {
  const yaml = readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
  const crds = parseCrdYaml(yaml);
  return extractSchemas(crds[0])[idx];
};

describe("generateSpecType", () => {
  it("should generate TypeScript interface for CertificateSpec", async () => {
    const schema = getSchema("sample-crd.yaml");
    const ts = await generateSpecType(schema);

    expect(ts).toContain("export interface CertificateSpec");
    expect(ts).toContain("secretName");
    expect(ts).toContain("issuerRef");
    expect(ts).toContain("dnsNames");
  });

  it("should mark required fields as non-optional", async () => {
    const schema = getSchema("sample-crd.yaml");
    const ts = await generateSpecType(schema);

    expect(ts).toMatch(/secretName:\s*string/);
    expect(ts).toMatch(/issuerRef:\s*\{/);
  });

  it("should mark optional fields with ?", async () => {
    const schema = getSchema("sample-crd.yaml");
    const ts = await generateSpecType(schema);

    expect(ts).toMatch(/duration\?/);
    expect(ts).toMatch(/dnsNames\?/);
    expect(ts).toMatch(/isCA\?/);
  });

  it("should generate enum types", async () => {
    const schema = getSchema("sample-crd.yaml");
    const ts = await generateSpecType(schema);

    expect(ts).toContain('"Issuer"');
    expect(ts).toContain('"ClusterIssuer"');
  });

  it("should generate types for nested objects", async () => {
    const schema = getSchema("cluster-scoped-crd.yaml");
    const ts = await generateSpecType(schema);

    expect(ts).toContain("acme");
    expect(ts).toContain("server");
    expect(ts).toContain("privateKeySecretRef");
  });
});

describe("generateFullType", () => {
  it("should generate full resource type including metadata", async () => {
    const schema = getSchema("sample-crd.yaml");
    const ts = await generateFullType(schema);

    expect(ts).toContain("export interface Certificate");
    expect(ts).toContain("apiVersion");
    expect(ts).toContain("kind");
    expect(ts).toContain("metadata");
  });
});
