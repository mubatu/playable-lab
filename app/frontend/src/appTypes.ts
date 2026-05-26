import type { ConfigField } from './types';

export type View = 'playables' | 'create';
export type CreateFormTab = 'assets' | 'parameters';
export type Notice = { type: 'info' | 'success' | 'error'; message: string } | null;
export type AssetPreview = { name: string; type: string; url: string; size?: number };
export type AssetSelectOption = { value: number; label: string; previewUrl?: string };
export type AssetOptionsById = Record<string, AssetSelectOption[]>;
export type ConfigGroup = {
  path: string;
  label: string;
  icon?: string;
  order: number;
  fields: ConfigField[];
  advancedFields: ConfigField[];
};
