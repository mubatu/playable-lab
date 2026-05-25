import { createServer as createHttpServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const {
  allowedAdNetworks,
  allowedLanguages,
  allowedOrientations
} = require('@smoud/playable-scripts/core/utils/parseArgvOptions.js');
const rootDir = resolve(__dirname, '..');
const frontendDir = join(__dirname, 'frontend');
const distDir = join(__dirname, 'dist');
const templatesDir = join(rootDir, 'templates');
const playablesDir = join(rootDir, 'my-playables');
const isDev = process.env.NODE_ENV !== 'production';
let viteServer = null;

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.mp3': 'audio/mpeg',
  '.zip': 'application/zip'
};

function sendJson(res, statusCode, body) {
  const payload = JSON.stringify(body);
  res.writeHead(statusCode, {
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(payload)
  });
  res.end(payload);
}

function sendText(res, statusCode, text) {
  res.writeHead(statusCode, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
}

function readRequestJson(req) {
  return new Promise((resolveRequest, reject) => {
    let body = '';
    req.setEncoding('utf8');
    req.on('data', (chunk) => {
      body += chunk;
      if (body.length > 25 * 1024 * 1024) {
        reject(new Error('Request body is too large.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolveRequest(body ? JSON.parse(body) : {});
      } catch {
        reject(new Error('Invalid JSON request body.'));
      }
    });
    req.on('error', reject);
  });
}

function safeJoin(base, target) {
  const resolved = resolve(base, target);
  const rel = relative(base, resolved);
  if (rel.startsWith('..') || normalize(rel).startsWith('..')) {
    throw new Error(`Unsafe path: ${target}`);
  }
  return resolved;
}

function slugify(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 72);
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch {
    return false;
  }
}

async function getManifest(templateId) {
  const manifestPath = safeJoin(templatesDir, join(templateId, 'template.json'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.id !== templateId) {
    throw new Error(`Template manifest id mismatch for ${templateId}.`);
  }
  return hydrateTemplateManifest(templateId, manifest);
}

async function hydrateTemplateManifest(templateId, manifest) {
  const configPath = safeJoin(templatesDir, join(templateId, 'src', 'config.ts'));
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
    assets: await hydrateTemplateAssets(templateId, manifest.assets || []),
    config: [...manifestFields, ...inferredFields]
  };
}

async function hydrateTemplateAssets(templateId, assets) {
  const templateDir = safeJoin(templatesDir, templateId);

  return Promise.all(
    assets.map(async (asset) => ({
      ...asset,
      defaultFiles: await listDefaultAssetFiles(templateId, templateDir, asset)
    }))
  );
}

async function listDefaultAssetFiles(templateId, templateDir, asset) {
  if (asset.path) {
    const filePath = safeJoin(templateDir, asset.path);
    if (!(await pathExists(filePath))) return [];
    const fileStats = await stat(filePath);
    return [buildTemplateAssetPreview(templateId, asset.path, fileStats.size)];
  }

  if (!asset.directory || !asset.filePattern) return [];

  const directoryPath = safeJoin(templateDir, asset.directory);
  if (!(await pathExists(directoryPath))) return [];

  const matcher = assetPatternMatcher(asset.filePattern);
  const entries = await readdir(directoryPath, { withFileTypes: true });
  const assetPaths = entries
    .filter((entry) => entry.isFile() && matcher.test(entry.name))
    .map((entry) => join(asset.directory, entry.name))
    .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));

  return Promise.all(
    assetPaths.map(async (assetPath) => {
      const fileStats = await stat(safeJoin(templateDir, assetPath));
      return buildTemplateAssetPreview(templateId, assetPath, fileStats.size);
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
  const name = assetPath.split('/').at(-1) || assetPath;
  const extension = extname(assetPath).toLowerCase();
  return {
    name,
    type: contentTypes[extension] || 'application/octet-stream',
    size,
    url: `/template-assets/${encodeURIComponent(templateId)}/${assetPath.split('/').map(encodeURIComponent).join('/')}`
  };
}

function inferConfigFields(config) {
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

async function listTemplates() {
  const entries = await readdir(templatesDir, { withFileTypes: true });
  const manifests = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    try {
      manifests.push(await getManifest(entry.name));
    } catch {
      // Folders without a manifest are not lab-ready templates yet.
    }
  }

  return manifests;
}

async function listPlayables() {
  await mkdir(playablesDir, { recursive: true });
  const entries = await readdir(playablesDir, { withFileTypes: true });
  const playables = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;

    const playableDir = safeJoin(playablesDir, entry.name);
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

function getPlayableDir(slug) {
  if (slugify(slug) !== slug) throw new Error('Invalid playable slug.');
  return safeJoin(playablesDir, slug);
}

async function getPlayable(slug) {
  const playableDir = getPlayableDir(slug);
  const metadataPath = join(playableDir, 'playable.json');
  const metadata = JSON.parse(await readFile(metadataPath, 'utf8'));
  return {
    ...metadata,
    slug,
    path: playableDir
  };
}

async function getBuildConfig(slug) {
  const playable = await getPlayable(slug);
  const buildConfig = JSON.parse(await readFile(join(playable.path, 'build.json'), 'utf8'));
  return {
    playable,
    buildConfig,
    networks: allowedAdNetworks.filter((network) => network !== 'preview'),
    languages: allowedLanguages,
    orientations: allowedOrientations
  };
}

async function getBuildOutputDir(playable) {
  const buildConfig = JSON.parse(await readFile(join(playable.path, 'build.json'), 'utf8'));
  const outDir = typeof buildConfig.outDir === 'string' && buildConfig.outDir.trim() ? buildConfig.outDir : 'dist';
  return safeJoin(playable.path, outDir);
}

async function listPlayableBuilds(slug) {
  const playable = await getPlayable(slug);
  const outputDir = await getBuildOutputDir(playable);

  if (!(await pathExists(outputDir))) {
    return { builds: [], outputDir: relative(playable.path, outputDir) };
  }

  const builds = [];

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(directory, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
        continue;
      }

      if (!entry.isFile()) continue;

      const fileStats = await stat(fullPath);
      const path = relative(playable.path, fullPath);
      const extension = extname(entry.name).toLowerCase();

      builds.push({
        name: entry.name,
        path,
        extension,
        size: fileStats.size,
        updatedAt: fileStats.mtime.toISOString(),
        canOpen: extension === '.html',
        url: extension === '.html' ? `/generated/${encodeURIComponent(slug)}/${path.split('/').map(encodeURIComponent).join('/')}` : null
      });
    }
  }

  await walk(outputDir);
  builds.sort((a, b) => String(b.updatedAt).localeCompare(String(a.updatedAt)));

  return {
    builds,
    outputDir: relative(playable.path, outputDir)
  };
}

async function deletePlayableBuild(slug, buildPath) {
  if (typeof buildPath !== 'string' || !buildPath) throw new Error('Build path is required.');

  const playable = await getPlayable(slug);
  const outputDir = await getBuildOutputDir(playable);
  const filePath = safeJoin(playable.path, buildPath);
  const relToOutput = relative(outputDir, filePath);

  if (relToOutput.startsWith('..') || normalize(relToOutput).startsWith('..')) {
    throw new Error('Build file must be inside the build output folder.');
  }

  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) throw new Error('Only build files can be deleted.');

  await rm(filePath);
  return listPlayableBuilds(slug);
}

function findConfigField(manifest, path) {
  return (manifest.config || []).find((field) => field.path === path);
}

function getPath(target, path) {
  let cursor = target;
  for (const part of path.split('.')) {
    if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return undefined;
    cursor = cursor[part];
  }
  return cursor;
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

function parseGameConfig(source) {
  const start = source.indexOf('{');
  const end = source.lastIndexOf('} as const');
  if (start === -1 || end === -1) {
    throw new Error('Unable to parse GAME_CONFIG source.');
  }

  const objectLiteral = source.slice(start, end + 1);
  return Function(`"use strict"; return (${objectLiteral});`)();
}

function parseGameConfigDescriptions(source) {
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

async function applyConfig(templateDir, outputDir, manifest, overrides = {}) {
  const configPath = join(templateDir, 'src', 'config.ts');
  const config = parseGameConfig(await readFile(configPath, 'utf8'));

  for (const [path, rawValue] of Object.entries(overrides)) {
    const field = findConfigField(manifest, path);
    if (!field) continue;
    setPath(config, path, coerceConfigValue(field, rawValue));
  }

  await writeFile(join(outputDir, 'src', 'config.ts'), serializeConfig(config));
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

async function applyAssets(outputDir, manifest, uploads = {}) {
  const written = {};

  for (const asset of manifest.assets || []) {
    const uploaded = uploads[asset.id];
    const files = asset.multiple ? uploaded || [] : uploaded ? [uploaded] : [];
    const defaultFileCount = asset.defaultFiles?.length || 0;
    const selectedFileCount = files.length || defaultFileCount;
    if (asset.required && selectedFileCount === 0) throw new Error(`${asset.label} is required.`);
    if (asset.min && selectedFileCount < asset.min) throw new Error(`${asset.label} needs at least ${asset.min} file(s).`);

    written[asset.id] = [];
    for (let index = 0; index < files.length; index += 1) {
      written[asset.id].push(await writeAssetFile(outputDir, asset, files[index], index + 1));
    }
  }

  return written;
}

async function writeCatcherAssetsModule(outputDir, targetCount) {
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

async function createPlayable(templateId, payload) {
  const name = String(payload.name || '').trim();
  const slug = slugify(name);

  if (!name) throw new Error('Playable name is required.');
  if (!slug) throw new Error('Playable name must include letters or numbers.');

  const manifest = await getManifest(templateId);
  const templateDir = safeJoin(templatesDir, templateId);
  const playableDir = safeJoin(playablesDir, slug);

  await mkdir(playablesDir, { recursive: true });
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
      await writeCatcherAssetsModule(playableDir, writtenAssets.targets?.length || 0);
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

function normalizeBuildConfig(rawConfig) {
  const config = {};

  for (const [key, value] of Object.entries(rawConfig || {})) {
    if (/^[A-Za-z][A-Za-z0-9]*$/.test(key)) {
      config[key] = value;
    }
  }

  return config;
}

function runBuildCommand(playableDir, network, configPath) {
  return new Promise((resolveBuild, reject) => {
    const child = spawn('npm', ['run', 'build', '--', network, '--build-config', configPath], {
      cwd: playableDir,
      stdio: ['ignore', 'pipe', 'pipe']
    });
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      const result = { network, code, output: output.trim() };
      if (code === 0) resolveBuild(result);
      else reject(Object.assign(new Error(`Build failed for ${network}.`), { result }));
    });
  });
}

async function findNewestHtml(root, sinceMs) {
  let newest = null;

  async function walk(directory) {
    const entries = await readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(directory, entry.name);
      const rel = relative(root, fullPath);
      if (rel.startsWith('src') || rel.startsWith('.playable-lab') || rel.startsWith('node_modules')) continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (entry.isFile() && extname(entry.name) === '.html') {
        const fileStats = await stat(fullPath);
        if (fileStats.mtimeMs >= sinceMs && (!newest || fileStats.mtimeMs > newest.mtimeMs)) {
          newest = { path: fullPath, rel, mtimeMs: fileStats.mtimeMs };
        }
      }
    }
  }

  await walk(root);
  return newest;
}

async function previewPlayable(slug) {
  const playable = await getPlayable(slug);
  const startedAt = Date.now();
  const result = await runBuildCommand(playable.path, 'preview', 'build.json');

  const html = await findNewestHtml(playable.path, startedAt - 1000);
  if (!html) throw new Error('Preview build completed, but no generated HTML file was found.');

  return {
    slug,
    result,
    path: html.rel,
    url: `/generated/${encodeURIComponent(slug)}/${html.rel.split('/').map(encodeURIComponent).join('/')}`
  };
}

async function previewTemplateDemo(templateId) {
  await getManifest(templateId);
  const demoFileName = `${templateId}.html`;
  const demoPath = safeJoin(join(templatesDir, 'demos'), demoFileName);
  if (!(await pathExists(demoPath))) throw new Error(`Demo not found for ${templateId}.`);

  return {
    templateId,
    path: `demos/${demoFileName}`,
    url: `/template-demo/${encodeURIComponent(demoFileName)}`
  };
}

async function buildPlayable(slug, payload) {
  const playable = await getPlayable(slug);
  const networks = Array.isArray(payload.networks) ? payload.networks : [];
  const invalidNetworks = networks.filter((network) => !allowedAdNetworks.includes(network) || network === 'preview');

  if (networks.length === 0) throw new Error('Select at least one network.');
  if (invalidNetworks.length > 0) throw new Error(`Unsupported network: ${invalidNetworks.join(', ')}`);

  const buildConfig = normalizeBuildConfig(payload.config);
  const configPath = join(playable.path, 'build.json');
  const results = [];

  await writeFile(configPath, `${JSON.stringify(buildConfig, null, 2)}\n`);

  try {
    for (const network of networks) {
      results.push(await runBuildCommand(playable.path, network, 'build.json'));
    }
  } catch (error) {
    if (error.result) results.push(error.result);
    return {
      ok: false,
      results
    };
  }

  return {
    ok: true,
    results
  };
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const requestedPath = decodeURIComponent(pathname.replace(/^\/+/, ''));
  let filePath = safeJoin(distDir, requestedPath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    res.writeHead(200, { 'content-type': contentTypes[ext] || 'application/octet-stream' });
    res.end(await readFile(filePath));
  } catch {
    if (extname(requestedPath)) {
      sendText(res, 404, 'Not found');
      return;
    }

    filePath = join(distDir, 'index.html');
    try {
      res.writeHead(200, { 'content-type': contentTypes['.html'] });
      res.end(await readFile(filePath));
    } catch {
      sendText(res, 404, 'Frontend build not found. Run npm run build or use npm run dev.');
    }
  }
}

async function serveGenerated(req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const match = requestUrl.pathname.match(/^\/generated\/([^/]+)\/(.+)$/);
  if (!match) {
    sendText(res, 404, 'Not found');
    return;
  }

  const slug = decodeURIComponent(match[1]);
  const relativeFilePath = match[2].split('/').map(decodeURIComponent).join('/');
  const playableDir = getPlayableDir(slug);
  const filePath = safeJoin(playableDir, relativeFilePath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    res.writeHead(200, { 'content-type': contentTypes[ext] || 'application/octet-stream' });
    res.end(await readFile(filePath));
  } catch {
    sendText(res, 404, 'Not found');
  }
}

async function serveTemplateDemo(req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const match = requestUrl.pathname.match(/^\/template-demo\/(.+)$/);
  if (!match) {
    sendText(res, 404, 'Not found');
    return;
  }

  const relativeFilePath = match[1].split('/').map(decodeURIComponent).join('/');
  const filePath = safeJoin(join(templatesDir, 'demos'), relativeFilePath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    res.writeHead(200, { 'content-type': contentTypes[ext] || 'application/octet-stream' });
    res.end(await readFile(filePath));
  } catch {
    sendText(res, 404, 'Not found');
  }
}

async function serveTemplateAsset(req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const match = requestUrl.pathname.match(/^\/template-assets\/([^/]+)\/(.+)$/);
  if (!match) {
    sendText(res, 404, 'Not found');
    return;
  }

  const templateId = decodeURIComponent(match[1]);
  const relativeFilePath = match[2].split('/').map(decodeURIComponent).join('/');
  const filePath = safeJoin(safeJoin(templatesDir, templateId), relativeFilePath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    res.writeHead(200, { 'content-type': contentTypes[ext] || 'application/octet-stream' });
    res.end(await readFile(filePath));
  } catch {
    sendText(res, 404, 'Not found');
  }
}

async function handleApi(req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');

  if (req.method === 'GET' && requestUrl.pathname === '/api/templates') {
    sendJson(res, 200, { templates: await listTemplates() });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/playables') {
    sendJson(res, 200, { playables: await listPlayables() });
    return;
  }

  const buildOptionsMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)\/build-options$/);
  if (req.method === 'GET' && buildOptionsMatch) {
    const options = await getBuildConfig(buildOptionsMatch[1]);
    sendJson(res, 200, options);
    return;
  }

  const buildsMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)\/builds$/);
  if (req.method === 'GET' && buildsMatch) {
    const builds = await listPlayableBuilds(buildsMatch[1]);
    sendJson(res, 200, builds);
    return;
  }

  if (req.method === 'DELETE' && buildsMatch) {
    const payload = await readRequestJson(req);
    const builds = await deletePlayableBuild(buildsMatch[1], payload.path);
    sendJson(res, 200, builds);
    return;
  }

  const previewMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)\/preview$/);
  if (req.method === 'POST' && previewMatch) {
    const preview = await previewPlayable(previewMatch[1]);
    sendJson(res, 201, { preview });
    return;
  }

  const templateDemoMatch = requestUrl.pathname.match(/^\/api\/templates\/([^/]+)\/demo$/);
  if (req.method === 'POST' && templateDemoMatch) {
    const demo = await previewTemplateDemo(templateDemoMatch[1]);
    sendJson(res, 201, { demo });
    return;
  }

  const buildMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)\/build$/);
  if (req.method === 'POST' && buildMatch) {
    const payload = await readRequestJson(req);
    const build = await buildPlayable(buildMatch[1], payload);
    sendJson(res, build.ok ? 201 : 500, { build });
    return;
  }

  const createMatch = requestUrl.pathname.match(/^\/api\/templates\/([^/]+)\/create$/);
  if (req.method === 'POST' && createMatch) {
    const payload = await readRequestJson(req);
    const playable = await createPlayable(createMatch[1], payload);
    sendJson(res, 201, { playable });
    return;
  }

  sendJson(res, 404, { error: 'API route not found.' });
}

async function requestHandler(req, res) {
  try {
    if (req.url.startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }
    if (req.url.startsWith('/generated/')) {
      await serveGenerated(req, res);
      return;
    }
    if (req.url.startsWith('/template-demo/')) {
      await serveTemplateDemo(req, res);
      return;
    }
    if (req.url.startsWith('/template-assets/')) {
      await serveTemplateAsset(req, res);
      return;
    }
    if (viteServer) {
      viteServer.middlewares(req, res, () => sendText(res, 404, 'Not found'));
      return;
    }
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Unexpected server error.' });
  }
}

const appPort = Number(process.env.PORT || 3000);
await mkdir(playablesDir, { recursive: true });

if (isDev) {
  const { createServer: createViteServer } = await import('vite');
  viteServer = await createViteServer({
    configFile: join(rootDir, 'vite.config.ts'),
    server: { middlewareMode: true },
    appType: 'spa'
  });
}

const server = createHttpServer(requestHandler);
server.listen(appPort, '127.0.0.1', () => {
  console.log(`Playable Lab running at http://127.0.0.1:${appPort}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    if (viteServer) await viteServer.close();
    server.close();
    process.exit(0);
  });
}
