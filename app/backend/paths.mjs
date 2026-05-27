import { stat } from 'node:fs/promises';
import { normalize, relative, resolve } from 'node:path';

export function safeJoin(base, target) {
  const resolved = resolve(base, target);
  const rel = relative(base, resolved);
  if (rel.startsWith('..') || normalize(rel).startsWith('..')) {
    throw new Error(`Unsafe path: ${target}`);
  }
  return resolved;
}

export function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

export async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}
