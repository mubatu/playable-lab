export type FieldType = 'string' | 'number' | 'boolean' | 'array' | 'color';

export interface TemplateAsset {
  id: string;
  label: string;
  description?: string;
  accept?: string;
  required?: boolean;
  multiple?: boolean;
  min?: number;
  path?: string;
  directory?: string;
  filePattern?: string;
  defaultFiles?: TemplateAssetFile[];
}

export interface TemplateAssetFile {
  name: string;
  type: string;
  size?: number;
  url: string;
}

export interface ConfigField {
  path: string;
  label: string;
  type: FieldType;
  control?: 'input' | 'slider';
  sectionLabel?: string;
  description?: string;
  default?: unknown;
  min?: number;
  max?: number;
  step?: number;
  advanced?: boolean;
}

export interface PlayableTemplate {
  id: string;
  name: string;
  description?: string;
  entry?: string;
  assets?: TemplateAsset[];
  config?: ConfigField[];
}

export interface Playable {
  name: string;
  slug: string;
  templateId: string;
  templateName?: string;
  createdAt?: string | null;
}

export interface BuildArtifact {
  name: string;
  path: string;
  extension: string;
  size: number;
  updatedAt: string;
  canOpen: boolean;
  url?: string | null;
}

export interface BuildOptions {
  playable: Playable;
  buildConfig: Record<string, unknown>;
  networks: string[];
  languages: string[];
  orientations: string[];
}

export interface BuildResult {
  network: string;
  code: number;
  output?: string;
}

export interface BuildResponse {
  ok: boolean;
  results: BuildResult[];
}

export interface UploadedFilePayload {
  name: string;
  type: string;
  dataUrl: string | ArrayBuffer | null;
}
