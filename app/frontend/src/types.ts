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

export interface TemplateConfigSection {
  path: string;
  label: string;
  icon?: string;
}

export interface ConfigField {
  path: string;
  label: string;
  type: FieldType;
  control?: 'input' | 'slider' | 'asset-select';
  optionsFromAsset?: string;
  sectionPath?: string;
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
  configSections?: TemplateConfigSection[];
  config?: ConfigField[];
}

export interface Playable {
  name: string;
  slug: string;
  templateId: string;
  templateName?: string;
  sourceType?: 'template' | 'video';
  createdAt?: string | null;
  updatedAt?: string | null;
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

export interface VideoDraft {
  id: string;
  originalName: string;
  fileName: string;
  type: string;
  size: number;
  url: string;
  createdAt?: string;
}

export type VideoGuideId = 'guide-1' | 'guide-2' | 'guide-3';

export interface VideoEndButtonConfig {
  text: string;
  width: number;
  height: number;
  fontSize: number;
  centerYPercent: number;
  backgroundColor: string;
  textColor: string;
  pulseScale: number;
  pulseDurationMs: number;
}

export interface VideoStopover {
  id: string;
  timeMs: number;
  inputArea: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  hand: {
    centerX: number;
    centerY: number;
    width: number;
    guideId?: VideoGuideId;
    rotationDeg?: number;
  };
}

export interface VideoPlayable extends Playable {
  sourceType: 'video';
  video: {
    originalName: string;
    fileName: string;
    type: string;
    size: number;
    url: string;
  };
  stopovers: VideoStopover[];
  endButton?: VideoEndButtonConfig;
}
