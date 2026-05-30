import { readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { listDefaultAssetFiles } from './assets.mjs';
import { getPath, inferConfigFields, parseGameConfig, parseGameConfigDescriptions } from './config.mjs';
import { pathExists, safeJoin } from './paths.mjs';

export async function getManifest(context, templateId) {
  const manifestPath = safeJoin(context.templatesDir, join(templateId, 'template.json'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.id !== templateId) {
    throw new Error(`Template manifest id mismatch for ${templateId}.`);
  }
  return hydrateTemplateManifest(context, templateId, manifest);
}

async function hydrateTemplateManifest(context, templateId, manifest) {
  const configPath = safeJoin(context.templatesDir, join(templateId, 'src', 'config.ts'));
  const configSource = await readFile(configPath, 'utf8');
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
    assets: await hydrateTemplateAssets(context, templateId, manifest.assets || []),
    config: [...manifestFields, ...inferredFields]
  };
}

async function hydrateTemplateAssets(context, templateId, assets) {
  const templateDir = safeJoin(context.templatesDir, templateId);

  return Promise.all(
    assets.map(async (asset) => ({
      ...asset,
      defaultFiles: await listDefaultAssetFiles(templateId, templateDir, asset)
    }))
  );
}

export async function listTemplates(context) {
  const entries = await readdir(context.templatesDir, { withFileTypes: true });
  const manifests = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      const manifest = await getManifest(context, entry.name);
      if (!manifest.hidden) manifests.push(manifest);
    } catch {
      // Folders without a manifest are not lab-ready templates yet.
    }
  }

  return manifests;
}

export async function previewTemplateDemo(context, templateId) {
  await getManifest(context, templateId);
  const demoFileName = `${templateId}.html`;
  const demoPath = safeJoin(join(context.templatesDir, 'demos'), demoFileName);
  if (!(await pathExists(demoPath))) throw new Error(`Demo not found for ${templateId}.`);

  return {
    templateId,
    path: `demos/${demoFileName}`,
    url: `/template-demo/${encodeURIComponent(demoFileName)}`
  };
}
