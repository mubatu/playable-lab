import * as THREE from 'three';
import { ParticleFactory } from "./components/ParticleFactory.js";
import { Timer } from "./components/Timer.js";

// --- 1. GAME SETTINGS & GRID (15x15) ---
const GRID_SIZE = 15;
const TILE_SIZE = 1;

// 0 = Walkable, 1 = Wall
const mazeMap = [
  [0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0],
  [0, 1, 1, 0, 1, 0, 1, 1, 1, 0, 1, 0, 1, 1, 0],
  [0, 0, 1, 0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0],
  [1, 0, 1, 1, 1, 1, 1, 0, 1, 1, 1, 1, 1, 0, 1],
  [0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 0, 1, 1, 1, 0, 1, 1, 1, 1, 0],
  [0, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0],
  [0, 1, 0, 1, 1, 1, 1, 0, 1, 1, 1, 1, 0, 1, 0],
  [0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0],
  [1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1],
  [0, 0, 0, 0, 0, 1, 0, 0, 0, 1, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 0, 1, 0, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 1, 0, 0, 0, 0, 0, 0, 0],
  [0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 0],
  [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0]
];

let totalWalkableTiles = 0;
let visitedTilesCount = 0;
const floorMeshes = new Map(); // Track floors to change their color

// --- 2. SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

// Pull camera back to fit the 15x15 grid
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(GRID_SIZE / 2 - 0.5, GRID_SIZE / 2 - 0.5, 18);
camera.lookAt(GRID_SIZE / 2 - 0.5, GRID_SIZE / 2 - 0.5, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 3. BUILD VISUAL MAZE ---
const wallGeo = new THREE.BoxGeometry(TILE_SIZE, TILE_SIZE, TILE_SIZE);
const wallMat = new THREE.MeshBasicMaterial({ color: 0x444444 });
const floorGeo = new THREE.PlaneGeometry(TILE_SIZE, TILE_SIZE);

for (let y = 0; y < GRID_SIZE; y++) {
  for (let x = 0; x < GRID_SIZE; x++) {
    if (mazeMap[y][x] === 1) {
      const wall = new THREE.Mesh(wallGeo, wallMat);
      wall.position.set(x, y, 0);
      scene.add(wall);
    } else {
      // Unique material for each floor so we can paint them individually
      const floorMat = new THREE.MeshBasicMaterial({ color: 0x2a2a2a });
      const floor = new THREE.Mesh(floorGeo, floorMat);
      floor.position.set(x, y, -0.5);
      floor.userData.visited = false;
      scene.add(floor);

      floorMeshes.set(`${x},${y}`, floor);
      totalWalkableTiles++;
    }
  }
}

const raycastPlane = new THREE.Mesh(
    new THREE.PlaneGeometry(100, 100),
    new THREE.MeshBasicMaterial({ visible: false })
);
scene.add(raycastPlane);

// --- 4. PLAYER, POOL & TIMER ---
const player = new THREE.Mesh(
    new THREE.BoxGeometry(0.7, 0.7, 0.7),
    new THREE.MeshBasicMaterial({ color: 0xf0ff00 })
);
let playerGridX = 0;
let playerGridY = 0;
player.position.set(playerGridX, playerGridY, 0);
scene.add(player);

const particlePool = ParticleFactory.createPool(scene, 100);
const activeParticles = [];

function spawnExplosion(position) {
  for (let i = 0; i < 8; i++) {
    const p = particlePool.get();
    p.position.copy(position);
    p.position.z -= 0.2;
    p.visible = true;
    p.userData.velocity.set((Math.random() - 0.5) * 5, (Math.random() - 0.5) * 5, Math.random() * 3);
    p.userData.maxLife = 0.3 + Math.random() * 0.2;
    p.userData.life = 0;
    activeParticles.push(p);
  }
}

let isGameOver = false;

// 45 seconds to paint the whole board!
const gameTimer = new Timer(45, 'linear', () => {
  isGameOver = true;
  alert(`Time's up! You painted ${visitedTilesCount}/${totalWalkableTiles} tiles. Try again!`);
});

// Mark starting tile as visited
visitTile(playerGridX, playerGridY);

function visitTile(x, y) {
  const key = `${x},${y}`;
  const floor = floorMeshes.get(key);
  if (floor && !floor.userData.visited) {
    floor.userData.visited = true;
    floor.material.color.setHex(0x00ff00); // Paint it green
    visitedTilesCount++;

    if (visitedTilesCount >= totalWalkableTiles && !isGameOver) {
      isGameOver = true;
      gameTimer.isFinished = true; // Stop the timer
      setTimeout(() => alert("WINNER! You painted all the tiles!"), 100);
    }
  }
}

// --- 5. A* PATHFINDING ALGORITHM ---
function aStar(startX, startY, endX, endY) {
  if (mazeMap[endY]?.[endX] === 1 || mazeMap[endY]?.[endX] === undefined) return [];

  const openSet = [{ x: startX, y: startY }];
  const cameFrom = new Map();
  const gScore = new Map();
  const fScore = new Map();

  const startNode = `${startX},${startY}`;
  gScore.set(startNode, 0);
  fScore.set(startNode, Math.abs(startX - endX) + Math.abs(startY - endY));

  while (openSet.length > 0) {
    openSet.sort((a, b) => fScore.get(`${a.x},${a.y}`) - fScore.get(`${b.x},${b.y}`));
    const current = openSet.shift();
    const currentKey = `${current.x},${current.y}`;

    if (current.x === endX && current.y === endY) {
      const path = [];
      let curr = currentKey;
      while (cameFrom.has(curr)) {
        const [cx, cy] = curr.split(',').map(Number);
        path.push({ x: cx, y: cy });
        curr = cameFrom.get(curr);
      }
      return path.reverse();
    }

    const neighbors = [
      { x: current.x + 1, y: current.y }, { x: current.x - 1, y: current.y },
      { x: current.x, y: current.y + 1 }, { x: current.x, y: current.y - 1 }
    ];

    for (const neighbor of neighbors) {
      if (neighbor.x < 0 || neighbor.x >= GRID_SIZE || neighbor.y < 0 || neighbor.y >= GRID_SIZE) continue;
      if (mazeMap[neighbor.y][neighbor.x] === 1) continue;

      const neighborKey = `${neighbor.x},${neighbor.y}`;
      const tentativeGScore = gScore.get(currentKey) + 1;

      if (tentativeGScore < (gScore.get(neighborKey) ?? Infinity)) {
        cameFrom.set(neighborKey, currentKey);
        gScore.set(neighborKey, tentativeGScore);
        fScore.set(neighborKey, tentativeGScore + Math.abs(neighbor.x - endX) + Math.abs(neighbor.y - endY));

        if (!openSet.find(n => n.x === neighbor.x && n.y === neighbor.y)) {
          openSet.push(neighbor);
        }
      }
    }
  }
  return [];
}

// --- 6. INPUT LOGIC ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
let isDragging = false;
let currentPath = [];
let isMovingToNextTile = false;
let moveSpeed = 10;

window.addEventListener('pointerdown', (e) => {
  if (isGameOver) return;
  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObject(player);
  if (intersects.length > 0) isDragging = true;
});

window.addEventListener('pointerup', () => {
  isDragging = false;
});

window.addEventListener('pointermove', (e) => {
  if (!isDragging || isGameOver) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);
  const intersects = raycaster.intersectObject(raycastPlane);

  if (intersects.length > 0) {
    const targetX = Math.round(intersects[0].point.x);
    const targetY = Math.round(intersects[0].point.y);

    if (targetX >= 0 && targetX < GRID_SIZE && targetY >= 0 && targetY < GRID_SIZE && mazeMap[targetY][targetX] !== 1) {
      const startX = isMovingToNextTile ? currentPath[0].x : playerGridX;
      const startY = isMovingToNextTile ? currentPath[0].y : playerGridY;

      const newPath = aStar(startX, startY, targetX, targetY);

      if (isMovingToNextTile && currentPath.length > 0) {
        currentPath = [currentPath[0], ...newPath];
      } else {
        currentPath = newPath;
      }
    } else {
      if (!isMovingToNextTile) currentPath = [];
    }
  }
});

// --- 7. GAME LOOP ---
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  if (!isGameOver) {
    gameTimer.update(delta);

    // Movement Logic
    if (currentPath.length > 0) {
      isMovingToNextTile = true;
      const targetTile = currentPath[0];
      const targetPos = new THREE.Vector3(targetTile.x, targetTile.y, 0);

      const distance = player.position.distanceTo(targetPos);
      if (distance > 0.05) {
        const direction = new THREE.Vector3().subVectors(targetPos, player.position).normalize();
        player.position.addScaledVector(direction, moveSpeed * delta);
      } else {
        player.position.copy(targetPos);
        playerGridX = targetTile.x;
        playerGridY = targetTile.y;

        spawnExplosion(player.position);
        visitTile(playerGridX, playerGridY);

        currentPath.shift();
        if (currentPath.length === 0) isMovingToNextTile = false;
      }
    }
  }

  // Particle Logic (Updates even if game is over so the last explosion finishes)
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.userData.life += delta;

    if (p.userData.life >= p.userData.maxLife) {
      particlePool.release(p);
      activeParticles.splice(i, 1);
      continue;
    }

    p.position.addScaledVector(p.userData.velocity, delta);
    p.userData.velocity.z -= 15 * delta;

    const scale = 1.0 - (p.userData.life / p.userData.maxLife);
    p.scale.set(scale, scale, scale);
  }

  renderer.render(scene, camera);
});

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});