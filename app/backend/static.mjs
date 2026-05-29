import { createReadStream } from 'node:fs';
import { readFile, stat } from 'node:fs/promises';
import { extname, join } from 'node:path';
import { contentTypes, sendText } from './http.mjs';
import { getPlayableDir } from './playables.mjs';
import { safeJoin } from './paths.mjs';
import { getVideoDraftFile } from './videos.mjs';

function parseRangeHeader(rangeHeader, fileSize) {
  if (typeof rangeHeader !== 'string') return null;
  const match = rangeHeader.match(/^bytes=(\d*)-(\d*)$/);
  if (!match) return null;

  const [, startValue, endValue] = match;
  if (!startValue && !endValue) return null;

  let start;
  let end;

  if (!startValue) {
    const suffixLength = Number(endValue);
    if (!Number.isInteger(suffixLength) || suffixLength <= 0) return null;
    start = Math.max(0, fileSize - suffixLength);
    end = fileSize - 1;
  } else {
    start = Number(startValue);
    end = endValue ? Number(endValue) : fileSize - 1;
  }

  if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end < start || start >= fileSize) {
    return null;
  }

  return {
    start,
    end: Math.min(end, fileSize - 1)
  };
}

function streamFile(req, res, filePath, contentType, fileStats) {
  const range = parseRangeHeader(req.headers.range, fileStats.size);
  const baseHeaders = {
    'accept-ranges': 'bytes',
    'content-type': contentType
  };

  if (range) {
    res.writeHead(206, {
      ...baseHeaders,
      'content-length': range.end - range.start + 1,
      'content-range': `bytes ${range.start}-${range.end}/${fileStats.size}`
    });
    createReadStream(filePath, { start: range.start, end: range.end }).pipe(res);
    return;
  }

  res.writeHead(200, {
    ...baseHeaders,
    'content-length': fileStats.size
  });
  createReadStream(filePath).pipe(res);
}

export async function serveStatic(context, req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const pathname = requestUrl.pathname === '/' ? '/index.html' : requestUrl.pathname;
  const requestedPath = decodeURIComponent(pathname.replace(/^\/+/, ''));
  let filePath = safeJoin(context.distDir, requestedPath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    streamFile(req, res, filePath, contentTypes[ext] || 'application/octet-stream', fileStats);
  } catch {
    if (extname(requestedPath)) {
      sendText(res, 404, 'Not found');
      return;
    }

    filePath = join(context.distDir, 'index.html');
    try {
      res.writeHead(200, { 'content-type': contentTypes['.html'] });
      res.end(await readFile(filePath));
    } catch {
      sendText(res, 404, 'Frontend build not found. Run npm run build or use npm run dev.');
    }
  }
}

export async function serveGenerated(context, req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const match = requestUrl.pathname.match(/^\/generated\/([^/]+)\/(.+)$/);
  if (!match) {
    sendText(res, 404, 'Not found');
    return;
  }

  const slug = decodeURIComponent(match[1]);
  const relativeFilePath = match[2].split('/').map(decodeURIComponent).join('/');
  const playableDir = getPlayableDir(context, slug);
  const filePath = safeJoin(playableDir, relativeFilePath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    streamFile(req, res, filePath, contentTypes[ext] || 'application/octet-stream', fileStats);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

export async function serveTemplateDemo(context, req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const match = requestUrl.pathname.match(/^\/template-demo\/(.+)$/);
  if (!match) {
    sendText(res, 404, 'Not found');
    return;
  }

  const relativeFilePath = match[1].split('/').map(decodeURIComponent).join('/');
  const filePath = safeJoin(join(context.templatesDir, 'demos'), relativeFilePath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    streamFile(req, res, filePath, contentTypes[ext] || 'application/octet-stream', fileStats);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

export async function serveTemplateAsset(context, req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const match = requestUrl.pathname.match(/^\/template-assets\/([^/]+)\/(.+)$/);
  if (!match) {
    sendText(res, 404, 'Not found');
    return;
  }

  const templateId = decodeURIComponent(match[1]);
  const relativeFilePath = match[2].split('/').map(decodeURIComponent).join('/');
  const filePath = safeJoin(safeJoin(context.templatesDir, templateId), relativeFilePath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    streamFile(req, res, filePath, contentTypes[ext] || 'application/octet-stream', fileStats);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

export async function serveVideoTemplateAsset(context, req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const match = requestUrl.pathname.match(/^\/video-template-assets\/(.+)$/);
  if (!match) {
    sendText(res, 404, 'Not found');
    return;
  }

  const relativeFilePath = match[1].split('/').map(decodeURIComponent).join('/');
  const filePath = safeJoin(context.videoTemplateDir, relativeFilePath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    streamFile(req, res, filePath, contentTypes[ext] || 'application/octet-stream', fileStats);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

export async function servePlayableAsset(context, req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const match = requestUrl.pathname.match(/^\/playable-assets\/([^/]+)\/(.+)$/);
  if (!match) {
    sendText(res, 404, 'Not found');
    return;
  }

  const slug = decodeURIComponent(match[1]);
  const relativeFilePath = match[2].split('/').map(decodeURIComponent).join('/');
  const filePath = safeJoin(getPlayableDir(context, slug), relativeFilePath);

  try {
    const fileStats = await stat(filePath);
    if (!fileStats.isFile()) {
      sendText(res, 404, 'Not found');
      return;
    }

    const ext = extname(filePath);
    streamFile(req, res, filePath, contentTypes[ext] || 'application/octet-stream', fileStats);
  } catch {
    sendText(res, 404, 'Not found');
  }
}

export async function serveVideoDraft(context, req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');
  const match = requestUrl.pathname.match(/^\/video-drafts\/([^/]+)\/(.+)$/);
  if (!match) {
    sendText(res, 404, 'Not found');
    return;
  }

  try {
    const draftId = decodeURIComponent(match[1]);
    const fileName = decodeURIComponent(match[2]);
    const file = await getVideoDraftFile(context, draftId, fileName);
    const fileStats = await stat(file.path);
    streamFile(req, res, file.path, file.type || 'application/octet-stream', fileStats);
  } catch {
    sendText(res, 404, 'Not found');
  }
}
