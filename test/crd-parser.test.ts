import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { parseCrdYaml, parseCrdFile } from "../src/crd-parser.js";

const FIXTURE_DIR = resolve(import.meta.dirname, "fixtures");
const sampleYaml = readFileSync(resolve(FIXTURE_DIR, "sample-crd.yaml"), "utf-8");

describe("parseCrdYaml", () => {
  it("should parse a single CRD from YAML", () => {
    const crds = parseCrdYaml(sampleYaml);
    expect(crds).toHaveLength(1);
    expect(crds[0].kind).toBe("CustomResourceDefinition");
    expect(crds[0].spec.names.kind).toBe("Certificate");
    expect(crds[0].spec.group).toBe("cert-manager.io");
  });

  it("should return empty array for non-CRD YAML", () => {
    const yaml = `
apiVersion: v1
kind: ConfigMap
metadata:
  name: test
data:
  key: value
`;
    const crds = parseCrdYaml(yaml);
    expect(crds).toHaveLength(0);
  });

  it("should handle multi-document YAML with mixed content", () => {
    const yaml = `
apiVersion: v1
kind: Namespace
metadata:
  name: test
---
${sampleYaml}
`;
    const crds = parseCrdYaml(yaml);
    expect(crds).toHaveLength(1);
    expect(crds[0].spec.names.kind).toBe("Certificate");
  });

  it("should extract versions correctly", () => {
    const crds = parseCrdYaml(sampleYaml);
    expect(crds[0].spec.versions).toHaveLength(1);
    expect(crds[0].spec.versions[0].name).toBe("v1");
    expect(crds[0].spec.versions[0].served).toBe(true);
    expect(crds[0].spec.versions[0].storage).toBe(true);
  });

  it("should extract scope correctly", () => {
    const crds = parseCrdYaml(sampleYaml);
    expect(crds[0].spec.scope).toBe("Namespaced");
  });
});

describe("parseCrdFile", () => {
  it("should parse CRD from file path", async () => {
    const crds = await parseCrdFile(resolve(FIXTURE_DIR, "sample-crd.yaml"));
    expect(crds).toHaveLength(1);
    expect(crds[0].spec.names.kind).toBe("Certificate");
  });

  it("should handle cluster-scoped CRD", async () => {
    const crds = await parseCrdFile(resolve(FIXTURE_DIR, "cluster-scoped-crd.yaml"));
    expect(crds).toHaveLength(1);
    expect(crds[0].spec.scope).toBe("Cluster");
    expect(crds[0].spec.names.kind).toBe("ClusterIssuer");
  });
});
