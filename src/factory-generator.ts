import type { ExtractedSchema } from "./types.js";

const toFactoryName = (kind: string): string =>
  kind.charAt(0).toLowerCase() + kind.slice(1);

const toOptsName = (kind: string): string => `${kind}Opts`;

const buildMetadataFields = (scope: "Namespaced" | "Cluster"): string => {
  const lines = [
    "  name: string;",
    ...(scope === "Namespaced" ? ["  namespace?: string;"] : []),
    "  labels?: Record<string, string>;",
    "  annotations?: Record<string, string>;",
  ];
  return lines.join("\n");
};

const buildOptsInterface = (schema: ExtractedSchema): string => {
  const optsName = toOptsName(schema.kind);
  const specTypeName = `${schema.kind}Spec`;
  const hasSpec = schema.specSchema !== undefined;

  return [
    `export interface ${optsName} {`,
    buildMetadataFields(schema.scope),
    ...(hasSpec ? [`  spec: ${specTypeName};`] : []),
    "}",
  ].join("\n");
};

const buildFactoryFunction = (schema: ExtractedSchema): string => {
  const fnName = toFactoryName(schema.kind);
  const optsName = toOptsName(schema.kind);
  const apiVersion = `${schema.group}/${schema.version}`;
  const resourceFn =
    schema.scope === "Cluster" ? "resourceClusterScope" : "resource";
  const returnType =
    schema.scope === "Cluster"
      ? "ClusterScopedResourceManifest"
      : "ResourceManifest";

  const metadataBlock =
    schema.scope === "Namespaced"
      ? [
          "    metadata: {",
          "      name: opts.name,",
          "      namespace: opts.namespace,",
          "      labels: opts.labels,",
          "      annotations: opts.annotations,",
          "    },",
        ]
      : [
          "    metadata: {",
          "      name: opts.name,",
          "      labels: opts.labels,",
          "      annotations: opts.annotations,",
          "    },",
        ];

  const specLine =
    schema.specSchema !== undefined ? ["    spec: opts.spec,"] : [];

  return [
    `export function ${fnName}(opts: ${optsName}): ${returnType} {`,
    `  return ${resourceFn}({`,
    `    apiVersion: "${apiVersion}",`,
    `    kind: "${schema.kind}",`,
    ...metadataBlock,
    ...specLine,
    "  });",
    "}",
  ].join("\n");
};

export const generateOptsInterface = buildOptsInterface;

export const generateFactory = buildFactoryFunction;

export const buildImports = (schema: ExtractedSchema): string => {
  const resourceFn =
    schema.scope === "Cluster" ? "resourceClusterScope" : "resource";
  const returnType =
    schema.scope === "Cluster"
      ? "ClusterScopedResourceManifest"
      : "ResourceManifest";

  return `import { ${resourceFn}, type ${returnType} } from "@cloudticon/ct-k8s-resources";`;
};
