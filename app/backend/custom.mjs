import { spawn } from 'node:child_process';
import { createReadStream } from 'node:fs';
import { mkdtemp, rm, stat } from 'node:fs/promises';
import { once } from 'node:events';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { sendText } from './http.mjs';

function runCommand(command, args, options) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, options);
    let output = '';

    child.stdout.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.stderr.on('data', (chunk) => {
      output += chunk.toString();
    });
    child.once('error', reject);
    child.once('exit', (code) => {
      if (code === 0) {
        resolve(output.trim());
      } else {
        reject(new Error(output.trim() || `Command failed with code ${code}.`));
      }
    });
  });
}

async function createStarterPackArchive(starterPackDir, zipPath) {
  if (process.platform === 'win32') {
    const escapedDestination = zipPath.replace(/'/g, "''");
    await runCommand(
      'powershell',
      [
        '-NoProfile',
        '-Command',
        `Compress-Archive -Path * -DestinationPath '${escapedDestination}' -Force`
      ],
      {
        cwd: starterPackDir,
        stdio: ['ignore', 'pipe', 'pipe']
      }
    );
    return;
  }

  await runCommand('zip', ['-r', zipPath, '.', '-x', '*.DS_Store'], {
    cwd: starterPackDir,
    stdio: ['ignore', 'pipe', 'pipe']
  });
}

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

  const tempDir = await mkdtemp(join(tmpdir(), 'playable-lab-starter-pack-'));
  const zipPath = join(tempDir, 'starter-pack.zip');

  try {
    await createStarterPackArchive(starterPackDir, zipPath);
  } catch {
    await rm(tempDir, { recursive: true, force: true });
    sendText(res, 500, 'Failed to create starter pack archive.');
    return;
  }

  res.writeHead(200, {
    'content-disposition': 'attachment; filename="starter-pack.zip"',
    'content-type': 'application/zip'
  });

  const stream = createReadStream(zipPath);
  stream.pipe(res);
  stream.once('error', async () => {
    res.destroy();
    await rm(tempDir, { recursive: true, force: true });
  });
  await once(stream, 'close');
  await rm(tempDir, { recursive: true, force: true });
}
