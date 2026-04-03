/* eslint-disable */
/**
 * This file was automatically generated from a Kubernetes CRD.
 * DO NOT MODIFY IT BY HAND.
 */

import { resource, type ResourceManifest } from "@cloudticon/ct-k8s-resources";

/**
 * ExternalSecretSpec defines the desired state of ExternalSecret.
 */
export interface ExternalSecretSpec {
  /**
   * Data defines the connection between the Kubernetes Secret keys and the Provider data
   */
  data?: {
    /**
     * ExternalSecretDataRemoteRef defines Provider data location.
     */
    remoteRef: {
      /**
       * Used to define a conversion Strategy
       */
      conversionStrategy?: "Default" | "Unicode";
      /**
       * Key is the key used in the Provider, mandatory
       */
      key: string;
      /**
       * Used to select a specific property of the Provider value (if a map), if supported
       */
      property?: string;
      /**
       * Used to select a specific version of the Provider value, if supported
       */
      version?: string;
    };
    secretKey: string;
  }[];
  /**
   * DataFrom is used to fetch all properties from a specific Provider data
   * If multiple entries are specified, the Secret keys are merged in the specified order
   */
  dataFrom?: {
    /**
     * Used to define a conversion Strategy
     */
    conversionStrategy?: "Default" | "Unicode";
    /**
     * Key is the key used in the Provider, mandatory
     */
    key: string;
    /**
     * Used to select a specific property of the Provider value (if a map), if supported
     */
    property?: string;
    /**
     * Used to select a specific version of the Provider value, if supported
     */
    version?: string;
  }[];
  /**
   * RefreshInterval is the amount of time before the values are read again from the SecretStore provider
   * Valid time units are "ns", "us" (or "µs"), "ms", "s", "m", "h"
   * May be set to zero to fetch and create it once. Defaults to 1h.
   */
  refreshInterval?: string;
  /**
   * SecretStoreRef defines which SecretStore to fetch the ExternalSecret data.
   */
  secretStoreRef: {
    /**
     * Kind of the SecretStore resource (SecretStore or ClusterSecretStore)
     * Defaults to `SecretStore`
     */
    kind?: string;
    /**
     * Name of the SecretStore resource
     */
    name: string;
  };
  /**
   * ExternalSecretTarget defines the Kubernetes Secret to be created
   * There can be only one target per ExternalSecret.
   */
  target: {
    /**
     * CreationPolicy defines rules on how to create the resulting Secret
     * Defaults to 'Owner'
     */
    creationPolicy?: "Owner" | "Merge" | "None";
    /**
     * Immutable defines if the final secret will be immutable
     */
    immutable?: boolean;
    /**
     * Name defines the name of the Secret resource to be managed
     * This field is immutable
     * Defaults to the .metadata.name of the ExternalSecret resource
     */
    name?: string;
    /**
     * Template defines a blueprint for the created Secret resource.
     */
    template?: {
      data?: {
        [k: string]: string;
      };
      /**
       * EngineVersion specifies the template engine version
       * that should be used to compile/execute the
       * template specified in .data and .templateFrom[].
       */
      engineVersion?: "v1" | "v2";
      /**
       * ExternalSecretTemplateMetadata defines metadata fields for the Secret blueprint.
       */
      metadata?: {
        annotations?: {
          [k: string]: string;
        };
        labels?: {
          [k: string]: string;
        };
      };
      templateFrom?: {
        configMap?: {
          items: {
            key: string;
          }[];
          name: string;
        };
        secret?: {
          items: {
            key: string;
          }[];
          name: string;
        };
      }[];
      type?: string;
    };
  };
}

export interface ExternalSecretOpts {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  spec: ExternalSecretSpec;
}

export function externalSecret(opts: ExternalSecretOpts): ResourceManifest {
  return resource({
    apiVersion: "external-secrets.io/v1alpha1",
    kind: "ExternalSecret",
    metadata: {
      name: opts.name,
      namespace: opts.namespace,
      labels: opts.labels,
      annotations: opts.annotations,
    },
    spec: opts.spec,
  });
}
