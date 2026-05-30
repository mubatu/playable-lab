import {
  buildPlayable,
  deletePlayableBuild,
  getBuildConfig,
  listPlayableBuilds,
  previewPlayable
} from './builds.mjs';
import { readRequestJson, sendJson } from './http.mjs';
import {
  createPlayable,
  getPlayableTemplate,
  listPlayables,
  updatePlayable
} from './playables.mjs';
import { listTemplates, previewTemplateDemo } from './templates.mjs';
import {
  createVideoPlayable,
  getVideoPlayable,
  updateVideoPlayable,
  uploadVideoDraft
} from './videos.mjs';

export async function handleApi(context, req, res) {
  const requestUrl = new URL(req.url, 'http://127.0.0.1');

  if (req.method === 'GET' && requestUrl.pathname === '/api/templates') {
    sendJson(res, 200, { templates: await listTemplates(context) });
    return;
  }

  if (req.method === 'GET' && requestUrl.pathname === '/api/playables') {
    sendJson(res, 200, { playables: await listPlayables(context) });
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/video-uploads') {
    const draft = await uploadVideoDraft(context, req);
    sendJson(res, 201, { draft });
    return;
  }

  if (req.method === 'POST' && requestUrl.pathname === '/api/video-playables') {
    const payload = await readRequestJson(req);
    const playable = await createVideoPlayable(context, payload);
    sendJson(res, 201, { playable });
    return;
  }

  const videoPlayableMatch = requestUrl.pathname.match(/^\/api\/video-playables\/([^/]+)$/);
  if (req.method === 'GET' && videoPlayableMatch) {
    const playable = await getVideoPlayable(context, videoPlayableMatch[1]);
    sendJson(res, 200, { playable });
    return;
  }

  if (req.method === 'PUT' && videoPlayableMatch) {
    const payload = await readRequestJson(req);
    const playable = await updateVideoPlayable(context, videoPlayableMatch[1], payload);
    sendJson(res, 200, { playable });
    return;
  }

  const playableTemplateMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)\/template$/);
  if (req.method === 'GET' && playableTemplateMatch) {
    const template = await getPlayableTemplate(context, playableTemplateMatch[1]);
    sendJson(res, 200, { template });
    return;
  }

  const updatePlayableMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)$/);
  if (req.method === 'PUT' && updatePlayableMatch) {
    const payload = await readRequestJson(req);
    const playable = await updatePlayable(context, updatePlayableMatch[1], payload);
    sendJson(res, 200, { playable });
    return;
  }

  const buildOptionsMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)\/build-options$/);
  if (req.method === 'GET' && buildOptionsMatch) {
    const options = await getBuildConfig(context, buildOptionsMatch[1]);
    sendJson(res, 200, options);
    return;
  }

  const buildsMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)\/builds$/);
  if (req.method === 'GET' && buildsMatch) {
    const builds = await listPlayableBuilds(context, buildsMatch[1]);
    sendJson(res, 200, builds);
    return;
  }

  if (req.method === 'DELETE' && buildsMatch) {
    const payload = await readRequestJson(req);
    const builds = await deletePlayableBuild(context, buildsMatch[1], payload.path);
    sendJson(res, 200, builds);
    return;
  }

  const previewMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)\/preview$/);
  if (req.method === 'POST' && previewMatch) {
    const preview = await previewPlayable(context, previewMatch[1]);
    sendJson(res, 201, { preview });
    return;
  }

  const templateDemoMatch = requestUrl.pathname.match(/^\/api\/templates\/([^/]+)\/demo$/);
  if (req.method === 'POST' && templateDemoMatch) {
    const demo = await previewTemplateDemo(context, templateDemoMatch[1]);
    sendJson(res, 201, { demo });
    return;
  }

  const buildMatch = requestUrl.pathname.match(/^\/api\/playables\/([^/]+)\/build$/);
  if (req.method === 'POST' && buildMatch) {
    const payload = await readRequestJson(req);
    const build = await buildPlayable(context, buildMatch[1], payload);
    sendJson(res, build.ok ? 201 : 500, { build });
    return;
  }

  const createMatch = requestUrl.pathname.match(/^\/api\/templates\/([^/]+)\/create$/);
  if (req.method === 'POST' && createMatch) {
    const payload = await readRequestJson(req);
    const playable = await createPlayable(context, createMatch[1], payload);
    sendJson(res, 201, { playable });
    return;
  }

  sendJson(res, 404, { error: 'API route not found.' });
}
