import { createServer as createHttpServer } from 'node:http';
import { mkdir } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';
import { handleApi } from './backend/api.mjs';
import { sendJson, sendText } from './backend/http.mjs';
import {
  serveGenerated,
  servePlayableAsset,
  serveStatic,
  serveTemplateAsset,
  serveTemplateDemo,
  serveVideoDraft
} from './backend/static.mjs';

const __dirname = fileURLToPath(new URL('.', import.meta.url));
const require = createRequire(import.meta.url);
const {
  allowedAdNetworks,
  allowedLanguages,
  allowedOrientations
} = require('@smoud/playable-scripts/core/utils/parseArgvOptions.js');

const rootDir = resolve(__dirname, '..');
const context = {
  rootDir,
  distDir: join(__dirname, 'dist'),
  templatesDir: join(rootDir, 'templates'),
  videoDraftsDir: join(rootDir, '.video-drafts'),
  playablesDir: join(rootDir, 'my-playables'),
  allowedAdNetworks,
  allowedLanguages,
  allowedOrientations
};

const isDev = process.env.NODE_ENV !== 'production';
let viteServer = null;

async function requestHandler(req, res) {
  try {
    if (req.url.startsWith('/api/')) {
      await handleApi(context, req, res);
      return;
    }
    if (req.url.startsWith('/generated/')) {
      await serveGenerated(context, req, res);
      return;
    }
    if (req.url.startsWith('/template-demo/')) {
      await serveTemplateDemo(context, req, res);
      return;
    }
    if (req.url.startsWith('/template-assets/')) {
      await serveTemplateAsset(context, req, res);
      return;
    }
    if (req.url.startsWith('/playable-assets/')) {
      await servePlayableAsset(context, req, res);
      return;
    }
    if (req.url.startsWith('/video-drafts/')) {
      await serveVideoDraft(context, req, res);
      return;
    }
    if (viteServer) {
      viteServer.middlewares(req, res, () => sendText(res, 404, 'Not found'));
      return;
    }
    await serveStatic(context, req, res);
  } catch (error) {
    sendJson(res, 500, { error: error.message || 'Unexpected server error.' });
  }
}

const appPort = Number(process.env.PORT || 3000);
await mkdir(context.playablesDir, { recursive: true });

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
