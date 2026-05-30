import { randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { cp, mkdir, mkdtemp, rm, stat, writeFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const require = createRequire(import.meta.url);
const archiver = require('archiver');
const { ZipArchive } = archiver;

const STARTER_TTL_MS = 10 * 60 * 1000;
const starterDownloads = new Map();

export async function createCustomStarterArchive(context) {
  const workDir = await mkdtemp(join(tmpdir(), 'playable-lab-custom-starter-'));
  const stageRoot = join(workDir, 'custom-game');
  await mkdir(stageRoot, { recursive: true });

  await cp(join(context.rootDir, 'custom', 'games'), join(stageRoot, 'games'), { recursive: true });
  await cp(join(context.rootDir, 'custom', 'reusables'), join(stageRoot, 'reusables'), { recursive: true });
  await writeRotatingCubeStarter(join(stageRoot, 'custom-game'));

  const zipPath = join(workDir, 'custom-game-starter.zip');
  await zipDirectory(stageRoot, zipPath);

  const id = randomUUID();
  const timeout = setTimeout(() => {
    void cleanupStarter(id);
  }, STARTER_TTL_MS);
  starterDownloads.set(id, { id, zipPath, workDir, timeout });

  return {
    id,
    url: `/api/custom/starter/download/${encodeURIComponent(id)}`
  };
}

export async function streamCustomStarterArchive(res, id) {
  const entry = starterDownloads.get(id);
  if (!entry) throw new Error('Starter package expired. Try clicking Custom again.');

  starterDownloads.delete(id);
  clearTimeout(entry.timeout);

  try {
    const fileStats = await stat(entry.zipPath);
    await new Promise((resolveStream, reject) => {
      const stream = createReadStream(entry.zipPath);
      stream.on('error', reject);
      res.on('error', reject);
      res.on('finish', resolveStream);
      res.writeHead(200, {
        'content-type': 'application/zip',
        'content-length': fileStats.size,
        'content-disposition': 'attachment; filename="custom-game-starter.zip"',
        'cache-control': 'no-store'
      });
      stream.pipe(res);
    });
  } finally {
    await rm(entry.workDir, { recursive: true, force: true });
  }
}

async function cleanupStarter(id) {
  const entry = starterDownloads.get(id);
  if (!entry) return;
  starterDownloads.delete(id);
  clearTimeout(entry.timeout);
  await rm(entry.workDir, { recursive: true, force: true });
}

async function zipDirectory(sourceDir, zipPath) {
  await new Promise((resolveZip, reject) => {
    const output = createWriteStream(zipPath);
    const archive = new ZipArchive({ zlib: { level: 9 } });

    output.on('close', resolveZip);
    output.on('error', reject);
    archive.on('error', reject);

    archive.pipe(output);
    archive.directory(sourceDir, 'custom-game');
    archive.finalize();
  });
}

async function writeRotatingCubeStarter(gameDir) {
  await mkdir(join(gameDir, 'src', 'css'), { recursive: true });
  await mkdir(join(gameDir, 'src', 'js', 'lib'), { recursive: true });
  await mkdir(join(gameDir, 'src', 'config'), { recursive: true });

  await Promise.all([
    writeFile(
      join(gameDir, 'index.html'),
      `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <title>Custom Starter Cube</title>
  <link rel="stylesheet" href="src/css/style.css" />
</head>
<body>
  <div id="app"></div>
  <script src="../reusables/vendor/three.min.js"></script>
  <script type="importmap">
    {
      "imports": {
        "three": "./src/js/lib/three-global-module.js"
      }
    }
  </script>
  <script type="module" src="src/js/main.js"></script>
</body>
</html>
`,
      'utf8'
    ),
    writeFile(
      join(gameDir, 'src', 'css', 'style.css'),
      `* {
  box-sizing: border-box;
}

html,
body {
  margin: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  background: radial-gradient(circle at top, #1e293b 0%, #020617 70%);
  color: #f8fafc;
  font-family: Inter, "Segoe UI", system-ui, sans-serif;
}

#app {
  position: fixed;
  inset: 0;
}
`,
      'utf8'
    ),
    writeFile(
      join(gameDir, 'src', 'js', 'main.js'),
      `import * as THREE from 'three';

const mountNode = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
mountNode?.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x020617);

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100);
camera.position.set(0, 0.4, 3.2);

const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
keyLight.position.set(2, 3, 2);
scene.add(keyLight);
scene.add(new THREE.AmbientLight(0x94a3b8, 0.5));

const geometry = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const material = new THREE.MeshStandardMaterial({ color: 0x38bdf8, roughness: 0.2, metalness: 0.4 });
const cube = new THREE.Mesh(geometry, material);
scene.add(cube);

function animate() {
  cube.rotation.x += 0.01;
  cube.rotation.y += 0.015;
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

animate();

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});
`,
      'utf8'
    ),
    writeFile(
      join(gameDir, 'src', 'js', 'lib', 'three-global-module.js'),
      `const THREE = window.THREE;

if (!THREE) {
  throw new Error('window.THREE is missing. Load reusables/vendor/three.min.js first.');
}

export const AmbientLight = THREE.AmbientLight;
export const BoxGeometry = THREE.BoxGeometry;
export const Color = THREE.Color;
export const DirectionalLight = THREE.DirectionalLight;
export const Mesh = THREE.Mesh;
export const MeshStandardMaterial = THREE.MeshStandardMaterial;
export const PerspectiveCamera = THREE.PerspectiveCamera;
export const Scene = THREE.Scene;
export const WebGLRenderer = THREE.WebGLRenderer;

export default THREE;
`,
      'utf8'
    ),
    writeFile(
      join(gameDir, 'src', 'config', 'game-config.json'),
      JSON.stringify(
        {
          meta: {
            name: 'custom-starter-cube',
            orientation: 'portrait'
          },
          gameplay: {
            rotateSpeedX: 0.01,
            rotateSpeedY: 0.015
          }
        },
        null,
        2
      ),
      'utf8'
    )
  ]);
}
