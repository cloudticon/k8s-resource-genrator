import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCrdYaml } from "../src/crd-parser.js";
import { extractSchemas } from "../src/schema-extractor.js";
import {
  generateOptsInterface,
  generateFactory,
  buildImports,
} from "../src/factory-generator.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures");

const getSchema = (name: string, idx = 0) => {
  const yaml = readFileSync(resolve(FIXTURE_DIR, name), "utf-8");
  const crds = parseCrdYaml(yaml);
  return extractSchemas(crds[0])[idx];
};

describe("generateOptsInterface", () => {
  it("should generate opts with name, labels, annotations for namespaced resource", () => {
    const schema = getSchema("sample-crd.yaml");
    const opts = generateOptsInterface(schema);

    expect(opts).toContain("export interface CertificateOpts");
    expect(opts).toContain("name: string");
    expect(opts).toContain("namespace?: string");
    expect(opts).toContain("labels?: Record<string, string>");
    expect(opts).toContain("annotations?: Record<string, string>");
    expect(opts).toContain("spec: CertificateSpec");
  });

  it("should omit namespace for cluster-scoped resources", () => {
    const schema = getSchema("cluster-scoped-crd.yaml");
    const opts = generateOptsInterface(schema);

    expect(opts).toContain("export interface ClusterIssuerOpts");
    expect(opts).toContain("name: string");
    expect(opts).not.toContain("namespace");
    expect(opts).toContain("spec: ClusterIssuerSpec");
  });
});

describe("generateFactory", () => {
  it("should generate factory function for namespaced CRD", () => {
    const schema = getSchema("sample-crd.yaml");
    const factory = generateFactory(schema);

    expect(factory).toContain("export function certificate(opts: CertificateOpts)");
    expect(factory).toContain('apiVersion: "cert-manager.io/v1"');
    expect(factory).toContain('kind: "Certificate"');
    expect(factory).toContain("return resource(");
    expect(factory).toContain("ResourceManifest");
    expect(factory).toContain("opts.namespace");
    expect(factory).toContain("spec: opts.spec");
  });

  it("should generate factory function for cluster-scoped CRD", () => {
    const schema = getSchema("cluster-scoped-crd.yaml");
    const factory = generateFactory(schema);

    expect(factory).toContain("export function clusterIssuer(opts: ClusterIssuerOpts)");
    expect(factory).toContain("return resourceClusterScope(");
    expect(factory).toContain("ClusterScopedResourceManifest");
    expect(factory).not.toContain("opts.namespace");
  });

  it("should use lowercase first letter for function name", () => {
    const schema = getSchema("multi-version-crd.yaml");
    const factory = generateFactory(schema);

    expect(factory).toContain("export function widget(");
  });
});

describe("buildImports", () => {
  it("should import resource for namespaced CRD", () => {
    const schema = getSchema("sample-crd.yaml");
    const imports = buildImports(schema);

    expect(imports).toContain("resource");
    expect(imports).toContain("ResourceManifest");
    expect(imports).toContain("@cloudticon/ct-k8s-resources");
  });

  it("should import resourceClusterScope for cluster-scoped CRD", () => {
    const schema = getSchema("cluster-scoped-crd.yaml");
    const imports = buildImports(schema);

    expect(imports).toContain("resourceClusterScope");
    expect(imports).toContain("ClusterScopedResourceManifest");
  });
});
