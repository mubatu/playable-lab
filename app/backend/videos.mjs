import { randomUUID } from 'node:crypto';
import { cp, mkdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { basename, extname, join } from 'node:path';
import { contentTypes, readRequestBuffer } from './http.mjs';
import { getPlayable, getPlayableDir } from './playables.mjs';
import { pathExists, safeJoin, slugify } from './paths.mjs';

const MAX_VIDEO_BYTES = 500 * 1024 * 1024;
const DEFAULT_HAND_WIDTH = 0.2;
const DEFAULT_GUIDE_ID = 'guide-1';
const VIDEO_GUIDE_IDS = new Set(['guide-1', 'guide-2', 'guide-3']);
const DEFAULT_END_BUTTON = {
  text: 'PLAY NOW!',
  width: 230,
  height: 60,
  fontSize: 32,
  centerYPercent: 73,
  backgroundColor: '#28ae03',
  textColor: '#ffffff',
  pulseScale: 1.08,
  pulseDurationMs: 900
};
const VIDEO_EXTENSIONS = new Set(['.m4v', '.mov', '.mp4', '.webm']);
const DEFAULT_BUILD_CONFIG = {
  outDir: 'builds',
  filename: '{app}_{name}_{version}_{date}_{language}_{network}',
  app: 'PlayableLab',
  name: 'Video',
  version: 'v1',
  language: 'en',
  orientation: 'both',
  googlePlayUrl: 'https://play.google.com/store/games',
  appStoreUrl: 'https://www.apple.com/app-store/'
};

function safeFileName(value, fallback = 'video') {
  let raw = String(value || fallback);
  try {
    raw = decodeURIComponent(raw);
  } catch {
    // Keep the raw header value if it was not URI encoded.
  }
  const name = basename(raw).replace(/[^A-Za-z0-9._-]+/g, '-');
  return name || fallback;
}

function validateVideoFile(name, type) {
  const extension = extname(name).toLowerCase();
  const isVideoType = typeof type === 'string' && type.startsWith('video/');
  if (!VIDEO_EXTENSIONS.has(extension) && !isVideoType) {
    throw new Error('Upload a video file such as MP4, WebM, MOV, or M4V.');
  }
  return extension && VIDEO_EXTENSIONS.has(extension) ? extension : '.mp4';
}

function normalizeNumber(value, fallback) {
  const numberValue = Number(value);
  return Number.isFinite(numberValue) ? numberValue : fallback;
}

function normalizeHexColor(value, fallback) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value) ? value : fallback;
}

function normalizeRotation(value) {
  const rotation = normalizeNumber(value, 0);
  return ((((rotation + 180) % 360) + 360) % 360) - 180;
}

function normalizeRect(rect) {
  const x = Math.max(0, Math.min(1, normalizeNumber(rect?.x, 0)));
  const y = Math.max(0, Math.min(1, normalizeNumber(rect?.y, 0)));
  const width = Math.max(0.01, Math.min(1 - x, normalizeNumber(rect?.width, 0.2)));
  const height = Math.max(0.01, Math.min(1 - y, normalizeNumber(rect?.height, 0.12)));
  return { x, y, width, height };
}

function normalizePoint(point) {
  const guideId = VIDEO_GUIDE_IDS.has(point?.guideId) ? point.guideId : DEFAULT_GUIDE_ID;
  return {
    centerX: Math.max(0, Math.min(1, normalizeNumber(point?.centerX, 0.5))),
    centerY: Math.max(0, Math.min(1, normalizeNumber(point?.centerY, 0.5))),
    width: Math.max(0.08, Math.min(0.5, normalizeNumber(point?.width, DEFAULT_HAND_WIDTH))),
    guideId,
    rotationDeg: normalizeRotation(point?.rotationDeg)
  };
}

function normalizeEndButton(endButton) {
  const text = String(endButton?.text || DEFAULT_END_BUTTON.text);
  return {
    text,
    width: getEndButtonWidth(text, DEFAULT_END_BUTTON.fontSize),
    height: DEFAULT_END_BUTTON.height,
    fontSize: DEFAULT_END_BUTTON.fontSize,
    centerYPercent: DEFAULT_END_BUTTON.centerYPercent,
    backgroundColor: normalizeHexColor(endButton?.backgroundColor, DEFAULT_END_BUTTON.backgroundColor),
    textColor: normalizeHexColor(endButton?.textColor, DEFAULT_END_BUTTON.textColor),
    pulseScale: DEFAULT_END_BUTTON.pulseScale,
    pulseDurationMs: DEFAULT_END_BUTTON.pulseDurationMs
  };
}

function getEndButtonWidth(text, fontSize) {
  return Math.max(120, Math.min(420, Math.ceil(text.length * fontSize * 0.68 + 48)));
}

function normalizeStopovers(stopovers) {
  if (!Array.isArray(stopovers)) return [];
  return stopovers
    .map((stopover, index) => ({
      id: String(stopover?.id || `stopover-${index + 1}`),
      timeMs: Math.max(0, Math.round(normalizeNumber(stopover?.timeMs, 0))),
      inputArea: normalizeRect(stopover?.inputArea),
      hand: normalizePoint(stopover?.hand)
    }))
    .sort((a, b) => a.timeMs - b.timeMs);
}

function buildDraftUrl(draft) {
  return `/video-drafts/${encodeURIComponent(draft.id)}/${encodeURIComponent(draft.fileName)}`;
}

function buildVideoPlayableUrl(slug, fileName) {
  return `/playable-assets/${encodeURIComponent(slug)}/src/assets/${encodeURIComponent(fileName)}`;
}

async function readDraft(context, draftId) {
  if (typeof draftId !== 'string' || !draftId) throw new Error('Video upload is required.');
  const draftDir = safeJoin(context.videoDraftsDir, draftId);
  const metadata = JSON.parse(await readFile(join(draftDir, 'draft.json'), 'utf8'));
  return {
    ...metadata,
    path: safeJoin(draftDir, metadata.fileName),
    url: buildDraftUrl(metadata)
  };
}

function createVideoDataSource(videoFileName, stopovers) {
  return `import videoSource from './assets/${videoFileName}';

export const VIDEO_SOURCE = videoSource;

export const VIDEO_STOPOVERS = ${JSON.stringify(stopovers, null, 2)} as const;

export type VideoStopover = (typeof VIDEO_STOPOVERS)[number];
`;
}

function createVideoConfigSource(endButton) {
  return `export const GAME_CONFIG = ${JSON.stringify({ ui: { endButton } }, null, 2)} as const;

export type GameConfig = typeof GAME_CONFIG;
`;
}

async function readEndButtonConfig(playableDir, fallback) {
  try {
    const configSource = await readFile(join(playableDir, 'src', 'config.ts'), 'utf8');
    const start = configSource.indexOf('{');
    const end = configSource.lastIndexOf('} as const');
    if (start === -1 || end === -1) return normalizeEndButton(fallback);
    const config = Function(`"use strict"; return (${configSource.slice(start, end + 1)});`)();
    return normalizeEndButton(config?.ui?.endButton || fallback);
  } catch {
    return normalizeEndButton(fallback);
  }
}

async function syncVideoRuntimeFromTemplate(context, playableDir) {
  const templateSrcDir = join(context.videoTemplateDir, 'src');
  const playableSrcDir = join(playableDir, 'src');
  await cp(join(templateSrcDir, 'index.ts'), join(playableSrcDir, 'index.ts'));
  await cp(join(templateSrcDir, 'styles.css'), join(playableSrcDir, 'styles.css'));
  await cp(join(templateSrcDir, 'ui'), join(playableSrcDir, 'ui'), { recursive: true });

  const templateAssetDir = join(templateSrcDir, 'assets');
  const playableAssetDir = join(playableSrcDir, 'assets');
  await mkdir(playableAssetDir, { recursive: true });
  await Promise.all(
    [...VIDEO_GUIDE_IDS].map((guideId) => cp(join(templateAssetDir, `${guideId}.png`), join(playableAssetDir, `${guideId}.png`)))
  );
}

export async function uploadVideoDraft(context, req) {
  await mkdir(context.videoDraftsDir, { recursive: true });

  const originalName = safeFileName(req.headers['x-file-name'] || 'video.mp4');
  const contentType = String(req.headers['content-type'] || 'application/octet-stream');
  const extension = validateVideoFile(originalName, contentType);
  const id = randomUUID();
  const fileName = `source${extension}`;
  const draftDir = safeJoin(context.videoDraftsDir, id);
  const buffer = await readRequestBuffer(req, MAX_VIDEO_BYTES);

  if (buffer.length === 0) throw new Error('Uploaded video is empty.');

  await mkdir(draftDir, { recursive: true });
  await writeFile(join(draftDir, fileName), buffer);

  const metadata = {
    id,
    originalName,
    fileName,
    type: contentTypes[extension] || contentType,
    size: buffer.length,
    createdAt: new Date().toISOString()
  };

  await writeFile(join(draftDir, 'draft.json'), `${JSON.stringify(metadata, null, 2)}\n`);
  return { ...metadata, url: buildDraftUrl(metadata) };
}

export async function createVideoPlayable(context, payload) {
  const name = String(payload.name || '').trim();
  const slug = slugify(name);

  if (!name) throw new Error('Playable name is required.');
  if (!slug) throw new Error('Playable name must include letters or numbers.');

  const draft = await readDraft(context, payload.draftId);
  const templateDir = context.videoTemplateDir;
  const playableDir = safeJoin(context.playablesDir, slug);

  await mkdir(context.playablesDir, { recursive: true });
  if (await pathExists(playableDir)) {
    throw new Error(`A playable named "${slug}" already exists.`);
  }

  try {
    await cp(templateDir, playableDir, {
      recursive: true,
      filter: (source) => !source.includes('/dist') && !source.endsWith('.DS_Store')
    });

    const assetDir = join(playableDir, 'src', 'assets');
    await mkdir(assetDir, { recursive: true });
    await cp(draft.path, join(assetDir, draft.fileName));

    const stopovers = normalizeStopovers(payload.stopovers);
    const endButton = normalizeEndButton(payload.endButton);
    await writeFile(join(playableDir, 'src', 'videoData.ts'), createVideoDataSource(draft.fileName, stopovers));
    await writeFile(join(playableDir, 'src', 'config.ts'), createVideoConfigSource(endButton));
    await writeFile(join(playableDir, 'build.json'), `${JSON.stringify({ ...DEFAULT_BUILD_CONFIG, name }, null, 2)}\n`);

    const metadata = {
      name,
      slug,
      templateId: 'video',
      templateName: 'Video',
      sourceType: 'video',
      video: {
        originalName: draft.originalName,
        fileName: draft.fileName,
        type: draft.type,
        size: draft.size
      },
      stopovers,
      endButton,
      createdAt: new Date().toISOString()
    };

    await writeFile(join(playableDir, 'playable.json'), `${JSON.stringify(metadata, null, 2)}\n`);
    return metadata;
  } catch (error) {
    await rm(playableDir, { recursive: true, force: true });
    throw error;
  }
}

export async function getVideoPlayable(context, slug) {
  const playable = await getPlayable(context, slug);
  if (playable.sourceType !== 'video') throw new Error('Playable is not a video playable.');
  const fileName = playable.video?.fileName;
  if (!fileName) throw new Error('Video source is missing.');

  const endButton = await readEndButtonConfig(playable.path, playable.endButton);

  return {
    ...playable,
    video: {
      ...playable.video,
      url: buildVideoPlayableUrl(slug, fileName)
    },
    stopovers: normalizeStopovers(playable.stopovers),
    endButton
  };
}

export async function updateVideoPlayable(context, slug, payload) {
  const playable = await getVideoPlayable(context, slug);
  const playableDir = getPlayableDir(context, slug);
  const stopovers = normalizeStopovers(payload.stopovers);
  const endButton = normalizeEndButton(payload.endButton || playable.endButton);
  const metadata = {
    ...playable,
    video: {
      originalName: playable.video.originalName,
      fileName: playable.video.fileName,
      type: playable.video.type,
      size: playable.video.size
    },
    stopovers,
    endButton,
    updatedAt: new Date().toISOString()
  };

  await syncVideoRuntimeFromTemplate(context, playableDir);
  await writeFile(join(playableDir, 'src', 'videoData.ts'), createVideoDataSource(playable.video.fileName, stopovers));
  await writeFile(join(playableDir, 'src', 'config.ts'), createVideoConfigSource(endButton));
  await writeFile(join(playableDir, 'playable.json'), `${JSON.stringify(metadata, null, 2)}\n`);

  return metadata;
}

export async function getVideoDraftFile(context, draftId, fileName) {
  const draft = await readDraft(context, draftId);
  if (fileName !== draft.fileName) throw new Error('Video draft file not found.');
  const fileStats = await stat(draft.path);
  return {
    path: draft.path,
    type: draft.type,
    size: fileStats.size
  };
}
