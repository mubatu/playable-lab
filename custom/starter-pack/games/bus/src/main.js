import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { ParticleFactory } from "./components/ParticleFactory.js";
import { Timer } from "./components/Timer.js";
import { Sound } from "./components/Sound.js"; // <-- Sound Module Imported

import bgmAudio from "./assets/a.mp3";
import popAudio from "./assets/b.mp3";

const bgMusic = new Sound(bgmAudio, true, 0.4);
const popSound = new Sound(popAudio, false, 0.8);


// --- 1. GAME SETTINGS & DATA ---
const COLORS = [0xff4d4d, 0x4CAF50, 0x2196F3]; // Red, Green, Blue

// Generate 6 Busses (2 of each color) and shuffle them
const busQueue = [...COLORS, ...COLORS].sort(() => Math.random() - 0.5);

// Generate exactly 18 passengers (3 per bus) to guarantee exact filling
const passengerColors = [];
busQueue.forEach(c => passengerColors.push(c, c, c));
passengerColors.sort(() => Math.random() - 0.5);

let isGameOver = false;

// --- 2. SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x1a1a1a);

// Center the camera over the grid and busses
const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 1, 14);
camera.lookAt(0, 1, 0);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// --- 3. BUS SYSTEM ---
let activeBusses = [null, null]; // Slot 0 (Left), Slot 1 (Right)
let waitingBus = null;           // Slot 2 (Top/Waiting)

const busGeo = new THREE.BoxGeometry(2.8, 1.2, 0.5);

function spawnBus(slotIndex, color) {
  if (!color) return null;

  // Using a wireframe to visually distinguish busses from solid passengers
  const mat = new THREE.MeshBasicMaterial({ color: color, wireframe: true, transparent: true, opacity: 0.8 });
  const busMesh = new THREE.Mesh(busGeo, mat);

  // Start them off-screen slightly so they "drive" in
  busMesh.position.set(0, 10, 0);
  scene.add(busMesh);

  return { mesh: busMesh, color: color, passengers: [], slot: slotIndex, isLeaving: false };
}

function getSlotPosition(slot) {
  if (slot === 0) return new THREE.Vector3(-2, 3, 0); // Active Left
  if (slot === 1) return new THREE.Vector3(2, 3, 0);  // Active Right
  return new THREE.Vector3(0, 5, -0.5);               // Waiting (Behind)
}

// Initial Spawns
activeBusses[0] = spawnBus(0, busQueue.shift());
activeBusses[1] = spawnBus(1, busQueue.shift());
waitingBus = spawnBus(2, busQueue.shift());

// --- 4. PASSENGER GRID ---
const passengers = [];
const passGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);

let pIdx = 0;
// Create a 6 (width) x 3 (depth) grid
for (let row = 0; row < 3; row++) {
  for (let col = 0; col < 6; col++) {
    const color = passengerColors[pIdx++];
    const mesh = new THREE.Mesh(passGeo, new THREE.MeshBasicMaterial({ color: color }));

    // row 2 is the front (closest to busses), row 0 is the back.
    mesh.position.set(-2.5 + (col * 1.0), -2 + (row * 1.0), 0);

    mesh.userData = {
      col: col,
      row: row,
      color: color,
      isMoving: false,
      arrived: false,
      targetBus: null,
      offsetX: 0
    };

    scene.add(mesh);
    passengers.push(mesh);
  }
}

// --- 5. MODULES: TIMER & PARTICLES ---
const gameTimer = new Timer(60, 'circular', () => {
  isGameOver = true;
  alert("Time's up! The station is overcrowded.");
});

const particlePool = ParticleFactory.createPool(scene, 100);
const activeParticles = [];

function spawnExplosion(position) {
  for (let i = 0; i < 15; i++) {
    const p = particlePool.get();
    p.position.copy(position);
    p.visible = true;
    p.userData.velocity.set((Math.random() - 0.5) * 8, (Math.random() - 0.5) * 8, Math.random() * 5);
    p.userData.maxLife = 0.2 + Math.random() * 0.3;
    p.userData.life = 0;
    activeParticles.push(p);
  }
}

// --- 5.5 MODULES: AUDIO ---

let hasStartedMusic = false;

// --- 6. INPUT LOGIC ---
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

window.addEventListener('pointerdown', (e) => {
  // START MUSIC ON FIRST TOUCH (Bypasses Autoplay block)
  if (!hasStartedMusic) {
    bgMusic.play();
    hasStartedMusic = true;
  }

  if (isGameOver) return;

  mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const intersects = raycaster.intersectObjects(passengers);
  if (intersects.length > 0) {
    const clicked = intersects[0].object;
    if (clicked.userData.isMoving) return;

    // 1. BLOCKING CHECK: Is there a passenger in the same column in a higher row?
    const isBlocked = passengers.some(p =>
        p !== clicked &&
        p.userData.col === clicked.userData.col &&
        p.userData.row > clicked.userData.row &&
        !p.userData.isMoving // If the person in front is already moving, we are unblocked
    );

    if (isBlocked) {
      console.log("Blocked by someone in front!");
      return;
    }

    // 2. BUS CHECK: Is there an active bus of the same color with space?
    const targetBus = activeBusses.find(b =>
        b && !b.isLeaving &&
        b.color === clicked.userData.color &&
        b.passengers.length < 3
    );

    if (targetBus) {
      clicked.userData.isMoving = true;
      targetBus.passengers.push(clicked);
      clicked.userData.targetBus = targetBus;

      // Calculate seat position (left, middle, right)
      const seatIndex = targetBus.passengers.length - 1; // 0, 1, or 2
      clicked.userData.offsetX = (seatIndex - 1) * 0.9;  // -0.9, 0, 0.9
    }
  }
});

// --- 7. GAME LOOP ---
const clock = new THREE.Clock();

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();

  if (!isGameOver) {
    gameTimer.update(delta);

    // A. Animate Busses driving into their slots
    [activeBusses[0], activeBusses[1], waitingBus].forEach(bus => {
      if (bus && !bus.isLeaving) {
        const target = getSlotPosition(bus.slot);
        bus.mesh.position.lerp(target, 5 * delta);
      }
    });

    // B. Animate Passengers moving to Busses
    for (let i = passengers.length - 1; i >= 0; i--) {
      const p = passengers[i];

      // THE FIX: Skip passengers that have already boarded
      if (!p || p.userData.boarded) continue;

      if (p.userData.isMoving && !p.userData.arrived) {
        const bus = p.userData.targetBus;

        // Track dynamic bus position so passengers follow it if it's currently sliding into place
        const targetPos = bus.mesh.position.clone();
        targetPos.x += p.userData.offsetX;
        targetPos.z += 0.5;

        const dist = p.position.distanceTo(targetPos);
        if (dist > 0.1) {
          p.position.lerp(targetPos, 10 * delta);
        } else {
          p.userData.arrived = true;
          p.position.copy(targetPos); // Snap to exact seat

          // C. Check if Bus is Full and Ready to Leave
          if (bus.passengers.length === 3 && bus.passengers.every(pas => pas.userData.arrived)) {
            bus.isLeaving = true;

            // <-- SOUND EFFECT PLAYED HERE -->
            popSound.play();

            spawnExplosion(bus.mesh.position);

            // Cleanup meshes from Scene
            scene.remove(bus.mesh);
            bus.passengers.forEach(pas => {
              scene.remove(pas);
              // THE FIX: Mark as boarded instead of splicing the array mid-loop!
              pas.userData.boarded = true;
            });

            // Queue Management: Shift waiting bus down, spawn new waiting bus
            activeBusses[bus.slot] = null;
            if (waitingBus) {
              waitingBus.slot = bus.slot;
              activeBusses[bus.slot] = waitingBus;
              waitingBus = null;

              if (busQueue.length > 0) {
                waitingBus = spawnBus(2, busQueue.shift());
              }
            }

            // THE FIX: Updated Win Condition
            const remaining = passengers.filter(pas => !pas.userData.boarded);
            if (remaining.length === 0) {
              isGameOver = true;
              gameTimer.isFinished = true;
              setTimeout(() => alert("ALL PASSENGERS BOARDED! You win!"), 100);
            }
          }
        }
      }
    }
  }

  // C. Particle Animation (Independent of game over state)
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.userData.life += delta;

    if (p.userData.life >= p.userData.maxLife) {
      particlePool.release(p);
      activeParticles.splice(i, 1);
      continue;
    }

    p.position.addScaledVector(p.userData.velocity, delta);
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