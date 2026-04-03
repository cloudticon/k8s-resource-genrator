import type { JSONSchema } from "json-schema-to-typescript";

export interface CrdVersion {
  readonly name: string;
  readonly served: boolean;
  readonly storage: boolean;
  readonly schema?: {
    readonly openAPIV3Schema?: JSONSchema;
  };
}

export interface CrdNames {
  readonly kind: string;
  readonly plural: string;
  readonly singular?: string;
  readonly listKind?: string;
  readonly shortNames?: readonly string[];
  readonly categories?: readonly string[];
}

export interface CrdSpec {
  readonly group: string;
  readonly names: CrdNames;
  readonly scope: "Namespaced" | "Cluster";
  readonly versions: readonly CrdVersion[];
}

export interface CrdDocument {
  readonly apiVersion: string;
  readonly kind: "CustomResourceDefinition";
  readonly metadata: { readonly name: string };
  readonly spec: CrdSpec;
}

export interface ExtractedSchema {
  readonly group: string;
  readonly kind: string;
  readonly version: string;
  readonly scope: "Namespaced" | "Cluster";
  readonly plural: string;
  readonly specSchema: JSONSchema | undefined;
  readonly fullSchema: JSONSchema;
}

export interface GeneratedCode {
  readonly group: string;
  readonly version: string;
  readonly kind: string;
  readonly types: string;
  readonly factory: string;
  readonly fullModule: string;
}
