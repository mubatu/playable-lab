import { spawn } from 'node:child_process';
import { stat } from 'node:fs/promises';
import { join } from 'node:path';
import { sendText } from './http.mjs';

export async function downloadStarterPack(context, res) {
  const starterPackDir = join(context.rootDir, 'custom', 'starter-pack');

  try {
    const fileStats = await stat(starterPackDir);
    if (!fileStats.isDirectory()) {
      sendText(res, 404, 'Starter pack not found.');
      return;
    }
  } catch {
    sendText(res, 404, 'Starter pack not found.');
    return;
  }

  res.writeHead(200, {
    'content-disposition': 'attachment; filename="starter-pack.zip"',
    'content-type': 'application/zip'
  });

  const zip = spawn('zip', ['-r', '-', '.', '-x', '*.DS_Store'], {
    cwd: starterPackDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  zip.stdout.pipe(res);
  zip.stderr.resume();
  zip.on('error', () => {
    res.destroy();
  });
}
