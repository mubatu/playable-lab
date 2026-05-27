import type { BuildResponse, ConfigField, PlayableTemplate, TemplateConfigSection, UploadedFilePayload } from '../types';
import type { ConfigGroup } from '../appTypes';

const hiddenBuildParameterKeys = new Set(['outDir', 'filename']);
const priorityBuildParameterKeys = ['googlePlayUrl', 'appStoreUrl'];

export function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

function cloneConfigValue(value: unknown) {
  return Array.isArray(value) ? [...value] : value;
}

export function resetValuesForTemplate(template: PlayableTemplate | null) {
  const values: Record<string, unknown> = {};
  for (const field of template?.config || []) {
    values[field.path] = cloneConfigValue(field.default);
  }
  return values;
}

export function formatDate(value?: string | null) {
  if (!value) return 'Unknown date';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));
}

export function formatBytes(bytes: number) {
  if (!Number.isFinite(bytes)) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export function fileExtension(name: string) {
  return name.includes('.') ? name.split('.').pop()?.toLowerCase() || '' : '';
}

export function isImageAsset(name: string, type: string) {
  return type.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(fileExtension(name));
}

export function isAudioAsset(name: string, type: string) {
  return type.startsWith('audio/') || ['mp3', 'wav', 'ogg', 'm4a', 'aac'].includes(fileExtension(name));
}

function acceptedFormatLabel(accept?: string) {
  const labels = new Set<string>();
  for (const rawType of String(accept || '').split(',')) {
    const type = rawType.trim().toLowerCase();
    if (!type) continue;
    if (type === 'image/png') labels.add('PNG');
    else if (type === 'image/jpeg' || type === 'image/jpg') labels.add('JPG');
    else if (type === 'image/webp') labels.add('WEBP');
    else if (type === 'audio/mpeg' || type === 'audio/mp3') labels.add('MP3');
    else if (type.startsWith('.')) labels.add(type.slice(1).toUpperCase());
    else labels.add(type.split('/').pop()?.toUpperCase() || type.toUpperCase());
  }
  return Array.from(labels).join(' or ');
}

function formatMetaLabel(accept?: string) {
  const format = acceptedFormatLabel(accept);
  return format ? `${format} only` : '';
}

export function buildAssetMetadata(accept?: string, sizes: Array<number | undefined> = []) {
  const format = acceptedFormatLabel(accept);
  const knownSizes = sizes.filter((size): size is number => Number.isFinite(size));
  if (knownSizes.length === 0) return formatMetaLabel(accept);

  const totalSize = knownSizes.reduce((sum, size) => sum + size, 0);
  const sizeText = knownSizes.length > 1 ? `${knownSizes.length} files · ${formatBytes(totalSize)}` : formatBytes(totalSize);
  return [format, sizeText].filter(Boolean).join(' · ');
}

export function titleize(value: string) {
  return String(value)
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

export function buildFieldLabel(key: string) {
  if (key === 'googlePlayUrl') return 'Google Play URL';
  if (key === 'appStoreUrl') return 'App Store URL';
  return titleize(key);
}

export function buildConfigEntries(buildConfig: Record<string, unknown>) {
  return Object.entries(buildConfig)
    .map(([key, value], index) => ({ key, value, index }))
    .filter(({ key }) => !hiddenBuildParameterKeys.has(key))
    .sort((first, second) => {
      const firstRank = priorityBuildParameterKeys.indexOf(first.key);
      const secondRank = priorityBuildParameterKeys.indexOf(second.key);
      const normalizedFirstRank = firstRank === -1 ? priorityBuildParameterKeys.length : firstRank;
      const normalizedSecondRank = secondRank === -1 ? priorityBuildParameterKeys.length : secondRank;

      return normalizedFirstRank - normalizedSecondRank || first.index - second.index;
    })
    .map(({ key, value }) => [key, value] as const);
}

function sectionPathForField(field: ConfigField) {
  if (field.sectionPath) return field.sectionPath;

  const parts = String(field.path || '').split('.').filter(Boolean);
  if (parts.length <= 1) return parts[0] || 'parameters';
  return parts.slice(0, -1).join('.');
}

function sectionLabel(sectionPath: string, fields: ConfigField[] = []) {
  const configuredLabel = fields.find((field) => field.sectionLabel)?.sectionLabel;
  if (configuredLabel) return configuredLabel;

  const sectionName = String(sectionPath || '').split('.').at(-1) || sectionPath;
  const acronyms: Record<string, string> = { hud: 'HUD', ui: 'UI' };
  return acronyms[sectionName] || titleize(sectionName);
}

export function groupConfigFields(fields: ConfigField[] = [], sections: TemplateConfigSection[] = []) {
  const groups: ConfigGroup[] = [];
  const groupByPath = new Map<string, (typeof groups)[number]>();
  const sectionByPath = new Map(sections.map((section, index) => [section.path, { ...section, order: index }]));

  fields.forEach((field, index) => {
    const path = sectionPathForField(field);
    const configuredSection = sectionByPath.get(path);
    const order = configuredSection?.order ?? sections.length + groups.length;
    let group = groupByPath.get(path);

    if (!group) {
      group = {
        path,
        label: configuredSection?.label || sectionLabel(path, fields),
        icon: configuredSection?.icon,
        order,
        fields: [],
        advancedFields: []
      };
      groupByPath.set(path, group);
      groups.push(group);
    }

    const target = field.advanced ? group.advancedFields : group.fields;
    target.push({ ...field, sectionLabel: field.sectionLabel, sectionPath: path });
    group.order = Math.min(group.order, order, sections.length + index);
  });

  return groups.sort((first, second) => first.order - second.order);
}

export function networkLabel(value: string) {
  const labels: Record<string, string> = {
    applovin: 'AppLovin',
    google: 'Google',
    meta: 'Meta',
    mintegral: 'Mintegral',
    unity: 'Unity'
  };
  return labels[value] || titleize(value);
}

export function formatBuildResults(build: BuildResponse | null) {
  if (!build) return '';
  return build.results
    .map((result) => {
      const heading = `${networkLabel(result.network)} exited with code ${result.code}`;
      return [heading, result.output].filter(Boolean).join('\n');
    })
    .join('\n\n');
}

export function valueAsInput(value: unknown) {
  if (value === undefined || value === null) return '';
  if (Array.isArray(value)) return JSON.stringify(value);
  return String(value);
}

export function readFileAsDataUrl(file: File): Promise<UploadedFilePayload> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve({ name: file.name, type: file.type, dataUrl: reader.result });
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
