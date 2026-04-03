/* eslint-disable */
/**
 * This file was automatically generated from a Kubernetes CRD.
 * DO NOT MODIFY IT BY HAND.
 */

import { resource, type ResourceManifest } from "@cloudticon/ct-k8s-resources";

/**
 * AppSpec defines the desired state of App.
 */
export interface AppSpec {
  discordChannelId?: string;
  globalValues?: {};
  importSecrets?: {
    environment: string;
    projectId: string;
  };
  namespace: string;
  project: string;
  prune?: boolean;
  repositories: {
    branch: string;
    name: string;
    path?: string;
    url: string;
    values?: {};
  }[];
  selfHeal?: boolean;
  sentry?: {
    gateway: string;
    host?: string;
    hosts?: string[];
    pathPrefix?: string;
  };
  title?: string;
  urls?: {
    name: string;
    url: string;
  }[];
}

export interface AppOpts {
  name: string;
  namespace?: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  spec: AppSpec;
}

export function app(opts: AppOpts): ResourceManifest {
  return resource({
    apiVersion: "apps.cloudticon.com/v1alpha1",
    kind: "App",
    metadata: {
      name: opts.name,
      namespace: opts.namespace,
      labels: opts.labels,
      annotations: opts.annotations,
    },
    spec: opts.spec,
  });
}
