import { createServer } from 'node:http';
import { spawn } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { createWriteStream } from 'node:fs';
import { extname, join, normalize, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import net from 'node:net';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const rootDir = resolve(__dirname, '..');
const publicDir = join(__dirname, 'public');
const templatesDir = join(rootDir, 'templates');
const previewsDir = join(rootDir, '.playable-lab', 'previews');
const activePreviews = new Map();

const contentTypes = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.svg': 'image/svg+xml'
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

async function getManifest(templateId) {
  const manifestPath = safeJoin(templatesDir, join(templateId, 'template.json'));
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'));
  if (manifest.id !== templateId) {
    throw new Error(`Template manifest id mismatch for ${templateId}.`);
  }
  return manifest;
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

function serializeConfig(config) {
  return `export const GAME_CONFIG = ${JSON.stringify(config, null, 2)} as const;\n\nexport type GameConfig = typeof GAME_CONFIG;\n`;
}

async function applyConfig(templateDir, previewDir, manifest, overrides = {}) {
  const configPath = join(templateDir, 'src', 'config.ts');
  const config = parseGameConfig(await readFile(configPath, 'utf8'));

  for (const [path, rawValue] of Object.entries(overrides)) {
    const field = findConfigField(manifest, path);
    if (!field) continue;
    setPath(config, path, coerceConfigValue(field, rawValue));
  }

  await writeFile(join(previewDir, 'src', 'config.ts'), serializeConfig(config));
}

function decodeDataUrl(file) {
  if (!file || typeof file.dataUrl !== 'string') throw new Error('Missing uploaded file data.');
  const commaIndex = file.dataUrl.indexOf(',');
  if (commaIndex === -1) throw new Error('Invalid uploaded file data.');
  return Buffer.from(file.dataUrl.slice(commaIndex + 1), 'base64');
}

async function writeAssetFile(previewDir, asset, file, index) {
  const relativePath = asset.multiple
    ? join(asset.directory, asset.filePattern.replace('{index}', String(index)))
    : asset.path;
  const outputPath = safeJoin(previewDir, relativePath);
  await mkdir(resolve(outputPath, '..'), { recursive: true });
  await writeFile(outputPath, decodeDataUrl(file));
  return relativePath;
}

async function applyAssets(previewDir, manifest, uploads = {}) {
  const written = {};

  for (const asset of manifest.assets || []) {
    const uploaded = uploads[asset.id];
    const files = asset.multiple ? uploaded || [] : uploaded ? [uploaded] : [];
    if (asset.required && files.length === 0) throw new Error(`${asset.label} is required.`);
    if (asset.min && files.length < asset.min) throw new Error(`${asset.label} needs at least ${asset.min} file(s).`);

    written[asset.id] = [];
    for (let index = 0; index < files.length; index += 1) {
      written[asset.id].push(await writeAssetFile(previewDir, asset, files[index], index + 1));
    }
  }

  return written;
}

async function writeCatcherAssetsModule(previewDir, targetCount) {
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

  await writeFile(join(previewDir, 'src', 'assets.ts'), source);
}

function findOpenPort(startPort = 4100) {
  return new Promise((resolvePort, reject) => {
    const server = net.createServer();
    server.unref();
    server.on('error', () => resolvePort(findOpenPort(startPort + 1)));
    server.listen(startPort, () => {
      const { port } = server.address();
      server.close(() => resolvePort(port));
    });
  });
}

async function waitForPreview(port, timeoutMs = 20000) {
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    try {
      await new Promise((resolveSocket, reject) => {
        const socket = net.createConnection({ port, host: '127.0.0.1' });
        socket.once('connect', () => {
          socket.end();
          resolveSocket();
        });
        socket.once('error', reject);
        socket.setTimeout(1000, () => {
          socket.destroy();
          reject(new Error('Timed out connecting to preview server.'));
        });
      });
      return;
    } catch {
      await new Promise((resolveSleep) => setTimeout(resolveSleep, 250));
    }
  }

  throw new Error('Preview server did not start in time.');
}

async function createPreview(templateId, payload) {
  const manifest = await getManifest(templateId);
  const templateDir = safeJoin(templatesDir, templateId);
  const previewId = `${templateId}-${Date.now()}-${randomUUID().slice(0, 8)}`;
  const previewDir = join(previewsDir, previewId);

  await mkdir(previewsDir, { recursive: true });
  await cp(templateDir, previewDir, {
    recursive: true,
    filter: (source) => !source.includes(`${templateId}/dist`) && !source.endsWith('.DS_Store')
  });

  const writtenAssets = await applyAssets(previewDir, manifest, payload.assets);
  await applyConfig(templateDir, previewDir, manifest, payload.config);

  if (templateId === 'catcher') {
    await writeCatcherAssetsModule(previewDir, writtenAssets.targets?.length || 0);
  }

  const port = await findOpenPort(4100 + activePreviews.size);
  const logPath = join(previewDir, 'preview.log');
  const logStream = createWriteStream(logPath, { flags: 'a' });
  const child = spawn('npm', ['run', 'dev', '--', '--port', String(port)], {
    cwd: previewDir,
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, BROWSER: 'none' }
  });

  child.stdout.pipe(logStream);
  child.stderr.pipe(logStream);
  activePreviews.set(previewId, { child, previewDir, port });
  child.once('exit', () => activePreviews.delete(previewId));

  await waitForPreview(port);

  return {
    id: previewId,
    url: `http://127.0.0.1:${port}`,
    path: previewDir
  };
}

async function serveStatic(req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const filePath = safeJoin(publicDir, decodeURIComponent(pathname.replace(/^\/+/, '')));

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

  const previewMatch = requestUrl.pathname.match(/^\/api\/templates\/([^/]+)\/preview$/);
  if (req.method === 'POST' && previewMatch) {
    const payload = await readRequestJson(req);
    const preview = await createPreview(previewMatch[1], payload);
    sendJson(res, 201, { preview });
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
    await serveStatic(req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Unexpected server error.' });
  }
}

async function cleanPreviews() {
  await rm(previewsDir, { recursive: true, force: true });
  await mkdir(previewsDir, { recursive: true });
}

const appPort = Number(process.env.PORT || 3000);
await cleanPreviews();

const server = createServer(requestHandler);
server.listen(appPort, '127.0.0.1', () => {
  console.log(`Playable Lab running at http://127.0.0.1:${appPort}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, async () => {
    for (const preview of activePreviews.values()) preview.child.kill('SIGTERM');
    server.close();
    await cleanPreviews();
    process.exit(0);
  });
}
