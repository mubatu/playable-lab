import { mkdir, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';
import { contentTypes } from './http.mjs';
import { pathExists, safeJoin } from './paths.mjs';

export async function listDefaultAssetFiles(templateId, templateDir, asset) {
  return listAssetFiles(templateDir, asset, (assetPath, size) => buildTemplateAssetPreview(templateId, assetPath, size));
}

export async function listPlayableAssetFiles(slug, playableDir, asset) {
  return listAssetFiles(playableDir, asset, (assetPath, size) => buildPlayableAssetPreview(slug, assetPath, size));
}

async function listAssetFiles(baseDir, asset, buildPreview) {
  if (asset.path) {
    const filePath = safeJoin(baseDir, asset.path);
    if (!(await pathExists(filePath))) return [];
    const fileStats = await stat(filePath);
    return [buildPreview(asset.path, fileStats.size)];
  }

  if (!asset.directory || !asset.filePattern) return [];

  const directoryPath = safeJoin(baseDir, asset.directory);
  if (!(await pathExists(directoryPath))) return [];

  const matcher = assetPatternMatcher(asset.filePattern);
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const assetPaths = entries
    .filter((entry) => entry.isFile() && matcher.test(entry.name))
    .map((entry) => join(asset.directory, entry.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return Promise.all(
    assetPaths.map(async (assetPath) => {
      const fileStats = await stat(safeJoin(baseDir, assetPath));
      return buildPreview(assetPath, fileStats.size);
    })
  );
}

function assetPatternMatcher(pattern) {
  const escaped = String(pattern)
    .replace(/[|\\{}()[\]^$+*?.]/g, '\\$&')
    .replace('\\{index\\}', '\\d+');
  return new RegExp(`^${escaped}$`);
}

function buildTemplateAssetPreview(templateId, assetPath, size) {
  return buildAssetPreview(assetPath, size, `/template-assets/${encodeURIComponent(templateId)}`);
}

function buildPlayableAssetPreview(slug, assetPath, size) {
  return buildAssetPreview(assetPath, size, `/playable-assets/${encodeURIComponent(slug)}`);
}

function buildAssetPreview(assetPath, size, baseUrl) {
  const name = assetPath.split('/').at(-1) || assetPath;
  const extension = extname(assetPath).toLowerCase();
  return {
    name,
    type: contentTypes[extension] || 'application/octet-stream',
    size,
    url: `${baseUrl}/${assetPath.split('/').map(encodeURIComponent).join('/')}`
  };
}

function decodeDataUrl(file) {
  if (!file || typeof file.dataUrl !== 'string') throw new Error('Missing uploaded file data.');
  const commaIndex = file.dataUrl.indexOf(',');
  if (commaIndex === -1) throw new Error('Invalid uploaded file data.');
  return Buffer.from(file.dataUrl.slice(commaIndex + 1), 'base64');
}

async function writeAssetFile(outputDir, asset, file, index) {
  const relativePath = asset.multiple
    ? join(asset.directory, asset.filePattern.replace('{index}', String(index)))
    : asset.path;
  const outputPath = safeJoin(outputDir, relativePath);
  await mkdir(resolve(outputPath, '..'), { recursive: true });
  await writeFile(outputPath, decodeDataUrl(file));
  return relativePath;
}

async function clearMultipleAssetFiles(outputDir, asset) {
  if (!asset.directory || !asset.filePattern) return;

  const directoryPath = safeJoin(outputDir, asset.directory);
  if (!(await pathExists(directoryPath))) return;

  const matcher = assetPatternMatcher(asset.filePattern);
  const entries = await readdir(directoryPath, { withFileTypes: true });
  await Promise.all(
    entries
      .filter((entry) => entry.isFile() && matcher.test(entry.name))
      .map((entry) => rm(safeJoin(directoryPath, entry.name), { force: true }))
  );
}

export async function applyAssets(outputDir, manifest, uploads = {}) {
  const written = {};

  for (const asset of manifest.assets || []) {
    const uploaded = uploads[asset.id];
    const files = asset.multiple ? uploaded || [] : uploaded ? [uploaded] : [];
    const defaultFileCount = asset.defaultFiles?.length || 0;
    const selectedFileCount = files.length || defaultFileCount;
    if (asset.required && selectedFileCount === 0) throw new Error(`${asset.label} is required.`);
    if (asset.min && selectedFileCount < asset.min) throw new Error(`${asset.label} needs at least ${asset.min} file(s).`);

    written[asset.id] = [];
    if (asset.multiple && Array.isArray(uploaded)) {
      await clearMultipleAssetFiles(outputDir, asset);
    }

    for (let index = 0; index < files.length; index += 1) {
      written[asset.id].push(await writeAssetFile(outputDir, asset, files[index], index + 1));
    }
  }

  return written;
}

export async function writeCatcherAssetsModule(outputDir, targetCount) {
  const targetImports = Array.from({ length: targetCount }, (_, index) => {
    const targetNumber = index + 1;
    return `import target${targetNumber} from './assets/target-${targetNumber}.png';`;
  }).join('\n');
  const targetNames = Array.from({ length: targetCount }, (_, index) => `target${index + 1}`).join(', ');

  const source = `import background from './assets/background.png';
import endBackground from './assets/end-background.png';
import basket from './assets/basket.png';
import bomb from './assets/bomb.png';
import hand from './assets/hand.png';
${targetImports}
import soundtrack from './assets/soundtrack.mp3';
import catchTarget from './assets/catch-target.mp3';
import catchBomb from './assets/catch-bomb.mp3';

export const imageSources = {
  background,
  endBackground,
  basket,
  bomb,
  hand,
  targets: [${targetNames}]
};

export const audioSources = {
  soundtrack,
  catchTarget,
  catchBomb
};

export interface LoadedImages {
  background: HTMLImageElement;
  endBackground: HTMLImageElement;
  basket: HTMLImageElement;
  bomb: HTMLImageElement;
  hand: HTMLImageElement;
  targets: HTMLImageElement[];
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(\`Image failed to load: \${src}\`));
    image.src = src;
  });
}

export async function loadImages(): Promise<LoadedImages> {
  const [backgroundImage, endBackgroundImage, basketImage, bombImage, handImage, ...targetImages] = await Promise.all([
    loadImage(imageSources.background),
    loadImage(imageSources.endBackground),
    loadImage(imageSources.basket),
    loadImage(imageSources.bomb),
    loadImage(imageSources.hand),
    ...imageSources.targets.map(loadImage)
  ]);

  return {
    background: backgroundImage,
    endBackground: endBackgroundImage,
    basket: basketImage,
    bomb: bombImage,
    hand: handImage,
    targets: targetImages
  };
}
`;

  await writeFile(join(outputDir, 'src', 'assets.ts'), source);
}
