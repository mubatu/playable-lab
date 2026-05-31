import { spawn } from 'node:child_process';
import { readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import { extname, join, normalize, relative } from 'node:path';
import { getPlayable } from './playables.mjs';
import { pathExists, safeJoin } from './paths.mjs';

function toPosixPath(filePath) {
  return String(filePath).split('\\').join('/');
}

function encodeUrlPath(filePath) {
  return toPosixPath(filePath).split('/').map(encodeURIComponent).join('/');
}

export async function getBuildConfig(context, slug) {
  const playable = await getPlayable(context, slug);
  const buildConfig = JSON.parse(await readFile(join(playable.path, 'build.json'), 'utf8'));
  return {
    playable,
    buildConfig,
    networks: context.allowedAdNetworks.filter((network) => network !== 'preview'),
    languages: context.allowedLanguages,
    orientations: context.allowedOrientations
  };
}

async function getBuildOutputDir(playable) {
  const buildConfig = JSON.parse(await readFile(join(playable.path, 'build.json'), 'utf8'));
  const outDir = typeof buildConfig.outDir === 'string' && buildConfig.outDir.trim() ? buildConfig.outDir : 'dist';
  return safeJoin(playable.path, outDir);
}

export async function listPlayableBuilds(context, slug) {
  const playable = await getPlayable(context, slug);
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
      const path = toPosixPath(relative(playable.path, fullPath));
      const extension = extname(entry.name).toLowerCase();

      builds.push({
        name: entry.name,
        path,
        extension,
        size: fileStats.size,
        updatedAt: fileStats.mtime.toISOString(),
        canOpen: extension === '.html',
        url: extension === '.html' ? `/generated/${encodeURIComponent(slug)}/${encodeUrlPath(path)}` : null
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

export async function deletePlayableBuild(context, slug, buildPath) {
  if (typeof buildPath !== 'string' || !buildPath) throw new Error('Build path is required.');

  const playable = await getPlayable(context, slug);
  const outputDir = await getBuildOutputDir(playable);
  const filePath = safeJoin(playable.path, buildPath);
  const relToOutput = relative(outputDir, filePath);

  if (relToOutput.startsWith('..') || normalize(relToOutput).startsWith('..')) {
    throw new Error('Build file must be inside the build output folder.');
  }

  const fileStats = await stat(filePath);
  if (!fileStats.isFile()) throw new Error('Only build files can be deleted.');

  await rm(filePath);
  return listPlayableBuilds(context, slug);
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
      shell: process.platform === 'win32',
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

async function findNewestHtml(root, sinceMs = 0) {
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

export async function previewPlayable(context, slug) {
  const playable = await getPlayable(context, slug);
  const outputDir = await getBuildOutputDir(playable);
  const startedAt = Date.now();
  const result = await runBuildCommand(playable.path, 'preview', 'build.json');

  const html = (await pathExists(outputDir))
    ? (await findNewestHtml(outputDir, startedAt - 1000)) || (await findNewestHtml(outputDir))
    : null;
  if (!html) throw new Error('Preview build completed, but no generated HTML file was found.');
  const path = toPosixPath(relative(playable.path, html.path));

  return {
    slug,
    result,
    path,
    url: `/generated/${encodeURIComponent(slug)}/${encodeUrlPath(path)}`
  };
}

export async function buildPlayable(context, slug, payload) {
  const playable = await getPlayable(context, slug);
  const networks = Array.isArray(payload.networks) ? payload.networks : [];
  const invalidNetworks = networks.filter((network) => !context.allowedAdNetworks.includes(network) || network === 'preview');

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
