import { cp, mkdir, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { applyAssets, listPlayableAssetFiles, writeCatcherAssetsModule } from './assets.mjs';
import { applyConfig, getPath, inferConfigFields, parseGameConfig, parseGameConfigDescriptions } from './config.mjs';
import { getManifest } from './templates.mjs';
import { pathExists, safeJoin, slugify } from './paths.mjs';

export async function listPlayables(context) {
  await mkdir(context.playablesDir, { recursive: true });
  const entries = await readdir(context.playablesDir, { withFileTypes: true });
  const playables = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const playableDir = safeJoin(context.playablesDir, entry.name);
    try {
      const metadata = JSON.parse(await readFile(join(playableDir, 'playable.json'), 'utf8'));
      playables.push({ ...metadata, slug: entry.name });
    } catch {
      playables.push({
        name: entry.name,
        slug: entry.name,
        templateId: 'unknown',
        createdAt: null
      });
    }
  }

  playables.sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')));
  return playables;
}

export function getPlayableDir(context, slug) {
  if (slugify(slug) !== slug) throw new Error('Invalid playable slug.');
  return safeJoin(context.playablesDir, slug);
}

export async function getPlayable(context, slug) {
  const playableDir = getPlayableDir(context, slug);
  const metadataPath = join(playableDir, 'playable.json');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  return {
    ...metadata,
    slug,
    path: playableDir
  };
}

export async function getPlayableTemplate(context, slug) {
  const playable = await getPlayable(context, slug);
  const manifestPath = join(playable.path, 'template.json');
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  const configSource = await readFile(join(playable.path, 'src', 'config.ts'), 'utf8');
  const config = parseGameConfig(configSource);
  const descriptions = parseGameConfigDescriptions(configSource);
  const manifestFields = (manifest.config || []).map((field) => {
    const defaultValue = getPath(config, field.path);
    return {
      ...field,
      ...(field.description ? {} : { description: descriptions.get(field.path) }),
      ...(defaultValue === undefined ? {} : { default: defaultValue })
    };
  });
  const existingPaths = new Set(manifestFields.map((field) => field.path));
  const inferredFields = inferConfigFields(config).filter((field) => !existingPaths.has(field.path));

  return {
    ...manifest,
    id: playable.templateId || manifest.id,
    name: manifest.name || playable.templateName || playable.templateId,
    assets: await Promise.all(
      (manifest.assets || []).map(async (asset) => ({
        ...asset,
        defaultFiles: await listPlayableAssetFiles(slug, playable.path, asset)
      }))
    ),
    config: [...manifestFields, ...inferredFields]
  };
}

export async function createPlayable(context, templateId, payload) {
  const name = String(payload.name || '').trim();
  const slug = slugify(name);

  if (!name) throw new Error('Playable name is required.');
  if (!slug) throw new Error('Playable name must include letters or numbers.');

  const manifest = await getManifest(context, templateId);
  const templateDir = safeJoin(context.templatesDir, templateId);
  const playableDir = safeJoin(context.playablesDir, slug);

  await mkdir(context.playablesDir, { recursive: true });
  if (await pathExists(playableDir)) {
    throw new Error(`A playable named "${slug}" already exists.`);
  }

  try {
    await cp(templateDir, playableDir, {
      recursive: true,
      filter: (source) => !source.includes(`${templateId}/dist`) && !source.endsWith('.DS_Store')
    });

    const writtenAssets = await applyAssets(playableDir, manifest, payload.assets);
    await applyConfig(templateDir, playableDir, manifest, payload.config);

    if (templateId === 'catcher') {
      const targetAsset = (manifest.assets || []).find((asset) => asset.id === 'targets');
      const targetCount = writtenAssets.targets?.length || targetAsset?.defaultFiles?.length || 0;
      await writeCatcherAssetsModule(playableDir, targetCount);
    }

    const metadata = {
      name,
      slug,
      templateId,
      templateName: manifest.name,
      createdAt: new Date().toISOString()
    };

    await writeFile(join(playableDir, 'playable.json'), `${JSON.stringify(metadata, null, 2)}\n`);
    return metadata;
  } catch (error) {
    await rm(playableDir, { recursive: true, force: true });
    throw error;
  }
}

export async function updatePlayable(context, slug, payload) {
  const playable = await getPlayable(context, slug);
  const manifest = await getPlayableTemplate(context, slug);
  const writtenAssets = await applyAssets(playable.path, manifest, payload.assets);
  await applyConfig(playable.path, playable.path, manifest, payload.config);

  if (playable.templateId === 'catcher') {
    const targetAsset = (manifest.assets || []).find((asset) => asset.id === 'targets');
    const targetCount = writtenAssets.targets?.length || targetAsset?.defaultFiles?.length || 0;
    await writeCatcherAssetsModule(playable.path, targetCount);
  }

  const metadata = {
    name: playable.name,
    slug: playable.slug,
    templateId: playable.templateId,
    templateName: manifest.name || playable.templateName,
    createdAt: playable.createdAt || null,
    updatedAt: new Date().toISOString()
  };

  await writeFile(join(playable.path, 'playable.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  return metadata;
}
