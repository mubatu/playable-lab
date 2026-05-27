import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export function getPath(target, path) {
  let cursor = target;
  for (const part of path.split('.')) {
    if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return undefined;
    cursor = cursor[part];
  }
  return cursor;
}

export function inferConfigFields(config) {
  const fields = [];

  function walk(value, path) {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      for (const [key, childValue] of Object.entries(value)) {
        walk(childValue, [...path, key]);
      }
      return;
    }

    fields.push(inferConfigField(path, value));
  }

  walk(config, []);
  return fields;
}

function inferConfigField(pathParts, value) {
  const path = pathParts.join('.');
  const valueType = typeof value;
  let type = 'string';

  if (valueType === 'number') type = 'number';
  else if (valueType === 'boolean') type = 'boolean';
  else if (Array.isArray(value)) type = 'array';
  else if (valueType === 'string' && /^#[0-9a-fA-F]{6}$/.test(value)) type = 'color';

  return {
    path,
    label: pathParts.map(labelize).join(' '),
    type,
    default: value,
    advanced: true
  };
}

function labelize(value) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function findConfigField(manifest, path) {
  return (manifest.config || []).find((field) => field.path === path);
}

function coerceConfigValue(field, value) {
  if (field.type === 'number') {
    const numberValue = Number(value);
    if (!Number.isFinite(numberValue)) throw new Error(`${field.label} must be a number.`);
    if (field.min !== undefined && numberValue < field.min) throw new Error(`${field.label} is below minimum.`);
    if (field.max !== undefined && numberValue > field.max) throw new Error(`${field.label} is above maximum.`);
    return numberValue;
  }

  if (field.type === 'boolean') return Boolean(value);

  if (field.type === 'color') {
    if (typeof value !== 'string' || !/^#[0-9a-fA-F]{6}$/.test(value)) {
      throw new Error(`${field.label} must be a hex color.`);
    }
    return value;
  }

  if (field.type === 'array') {
    if (Array.isArray(value)) return value;
    try {
      const parsed = JSON.parse(String(value ?? ''));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // Fall through to the validation error below.
    }
    throw new Error(`${field.label} must be a JSON array.`);
  }

  return String(value ?? '');
}

function setPath(target, path, value) {
  const parts = path.split('.');
  let cursor = target;
  for (const part of parts.slice(0, -1)) {
    if (!cursor[part] || typeof cursor[part] !== 'object') cursor[part] = {};
    cursor = cursor[part];
  }
  cursor[parts.at(-1)] = value;
}

export function parseGameConfig(source) {
  const start = source.indexOf('{');
  const end = source.lastIndexOf('} as const');
  if (start === -1 || end === -1) {
    throw new Error('Unable to parse GAME_CONFIG source.');
  }

  const objectLiteral = source.slice(start, end + 1);
  return Function(`"use strict"; return (${objectLiteral});`)();
}

export function parseGameConfigDescriptions(source) {
  const descriptions = new Map();
  const stack = [];
  let pendingComments = [];

  for (const line of source.split(/\r?\n/)) {
    const commentMatch = line.match(/^\s*\/\/\s?(.*)$/);
    if (commentMatch) {
      pendingComments.push(commentMatch[1].trim());
      continue;
    }

    const propertyMatch = line.match(/^(\s*)([A-Za-z_$][\w$]*)\s*:\s*(.*)$/);
    if (!propertyMatch) {
      if (line.trim() && !line.trim().startsWith('}') && !line.includes('export')) {
        pendingComments = [];
      }
      continue;
    }

    const [, indentText, key, rest] = propertyMatch;
    const indent = indentText.length;
    while (stack.length && stack.at(-1).indent >= indent) stack.pop();

    const path = [...stack.map((item) => item.key), key].join('.');
    if (pendingComments.length > 0) {
      descriptions.set(path, pendingComments.join(' '));
      pendingComments = [];
    }

    if (rest.trim().startsWith('{')) {
      stack.push({ key, indent });
    }
  }

  return descriptions;
}

function serializeConfig(config) {
  return `export const GAME_CONFIG = ${JSON.stringify(config, null, 2)} as const;\n\nexport type GameConfig = typeof GAME_CONFIG;\n`;
}

export async function applyConfig(templateDir, outputDir, manifest, overrides = {}) {
  const configPath = join(templateDir, 'src', 'config.ts');
  const config = parseGameConfig(await readFile(configPath, 'utf8'));

  for (const [path, rawValue] of Object.entries(overrides)) {
    const field = findConfigField(manifest, path);
    if (!field) continue;
    setPath(config, path, coerceConfigValue(field, rawValue));
  }

  await writeFile(join(outputDir, 'src', 'config.ts'), serializeConfig(config));
}
