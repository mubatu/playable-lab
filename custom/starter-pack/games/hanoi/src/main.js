import * as THREE from 'three';
import './css/style.css';
import { createGameScene } from './scene.js';
import { ParticleFactory } from './components/ParticleFactory.js';
import { Sound } from './components/Sound.js';
import { Timer } from './components/Timer.js';
import './components/HandTutorial.js';
import playSfxPath from './assets/a.mp3';
import bgmPath from './assets/b.mp3';

window.THREE = THREE;

const DISC_RADIUS = 0.72;
const DISC_HEIGHT = 0.36;
const BASE_Y = 0.2;
const STACK_GAP = 0.38;
const GAME_DURATION = 70;
const STICK_SPACING = 2.7;
const TUTORIAL_FROM_STICK = 0;
const TUTORIAL_TO_STICK = 5;

const HAND_ICON_SVG = [
  '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">',
  '<circle cx="64" cy="64" r="61" fill="#ffffff" fill-opacity="0.08"/>',
  '<path d="M51 106c-10-10-15-23-15-36 0-9 5-15 11-15 5 0 8 3 10 7V30c0-5 4-9 9-9s9 4 9 9v21h2V35c0-5 4-9 9-9s9 4 9 9v20h2V43c0-5 4-9 9-9s9 4 9 9v34c0 24-16 43-41 43H74c-9 0-17-5-23-14z" fill="#ffffff"/>',
  '</svg>'
].join('');
const HAND_ICON_URL = `data:image/svg+xml;utf8,${encodeURIComponent(HAND_ICON_SVG)}`;

const STICK_LAYOUT = [
  { x: -2.5 * STICK_SPACING, z: 0 },
  { x: -1.5 * STICK_SPACING, z: 0 },
  { x: -0.5 * STICK_SPACING, z: 0 },
  { x: 0.5 * STICK_SPACING, z: 0 },
  { x: 1.5 * STICK_SPACING, z: 0 },
  { x: 2.5 * STICK_SPACING, z: 0 }
];
const STICK_COUNT = STICK_LAYOUT.length;

const COLORS = [
  { id: 'red', hex: 0xf05454 },
  { id: 'teal', hex: 0x2aa198 },
  { id: 'gold', hex: 0xf2c14e },
  { id: 'purple', hex: 0x8d6cab },
  { id: 'green', hex: 0x4caf50 }
];

const INITIAL_STACKS = [
  ['red', 'teal', 'gold'],
  ['purple', 'green', 'gold'],
  ['red', 'purple', 'teal'],
  ['green', 'red', 'teal'],
  ['purple', 'gold', 'green'],
  []
];

const { scene, camera, renderer } = createGameScene();

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const clock = new THREE.Clock();

const particlePool = ParticleFactory.createPool(scene, 120);
const activeParticles = [];

const playSfx = new Sound(playSfxPath, false, 0.85);
const bgm = new Sound(bgmPath, true, 0.4);

const ui = createUI();

const board = {
  sticks: [],
  discs: [],
  stackData: INITIAL_STACKS.map((colors) => [...colors]),
  stickPositions: []
};

let gameStarted = false;
let gameEnded = false;
let selectedStickIndex = null;
let selectedDisc = null;
let activeMove = null;
let gameTimer = null;
let handTutorial = null;
let tutorialPhase = 'idle';
let tutorialPhaseStartMs = 0;
let tutorialFromPoint = null;
let tutorialToPoint = null;

buildBoard();
renderStacks();

window.addEventListener('pointerdown', onPointerDown);

renderer.setAnimationLoop(() => {
  const delta = clock.getDelta();
  const now = performance.now();

  updateTimer(delta);
  updateMove(delta);
  updateParticles(delta);
  pulseSelection();
  updateHandTutorial(now);

  renderer.render(scene, camera);
});

function createUI() {
  const root = document.createElement('div');
  root.className = 'ui-root';
  document.body.appendChild(root);

  const playOverlay = document.createElement('div');
  playOverlay.className = 'overlay visible';

  const title = document.createElement('h1');
  title.className = 'title';
  title.textContent = 'Color Hanoi';

  const subtitle = document.createElement('p');
  subtitle.className = 'subtitle';
  subtitle.textContent = 'Collect same-colored circles on the same stick.';

  const playButton = document.createElement('button');
  playButton.className = 'cta play';
  playButton.textContent = 'Play';
  playButton.addEventListener('click', startGame);

  playOverlay.append(title, subtitle, playButton);

  const endOverlay = document.createElement('div');
  endOverlay.className = 'overlay end';

  const endTitle = document.createElement('h2');
  endTitle.className = 'end-title';
  endTitle.textContent = '';

  const downloadButton = document.createElement('button');
  downloadButton.className = 'cta download';
  downloadButton.textContent = 'Download Now';
  downloadButton.addEventListener('click', () => {
    window.location.href = 'https://google.com';
  });

  endOverlay.append(endTitle, downloadButton);
  root.append(playOverlay, endOverlay);

  return {
    playOverlay,
    endOverlay,
    endTitle
  };
}

function startGame() {
  if (gameStarted) {
    return;
  }

  gameStarted = true;
  ui.playOverlay.classList.remove('visible');
  playSfx.play();
  bgm.play();

  gameTimer = new Timer(GAME_DURATION, 'circular', () => {
    endGame(false);
  });

  gameTimer.element.style.top = '16px';
  gameTimer.element.style.left = 'auto';
  gameTimer.element.style.right = '16px';
  gameTimer.element.style.transform = 'none';

  startFirstMoveTutorial();
}

function getStickTutorialPoint(stickIndex) {
  const { x, z } = board.stickPositions[stickIndex];
  const stackHeight = board.stackData[stickIndex].length;
  return {
    space: 'world',
    x,
    y: discYForLevel(Math.max(stackHeight - 1, 0)) + 0.28,
    z
  };
}

function startFirstMoveTutorial() {
  if (!window.HandTutorial || !board.stickPositions.length) {
    return;
  }

  stopFirstMoveTutorial();

  tutorialFromPoint = getStickTutorialPoint(TUTORIAL_FROM_STICK);
  tutorialToPoint = getStickTutorialPoint(TUTORIAL_TO_STICK);

  handTutorial = new window.HandTutorial({
    container: renderer.domElement.parentElement,
    renderer,
    camera,
    assetUrl: HAND_ICON_URL,
    gesture: 'tap',
    from: tutorialFromPoint,
    to: tutorialFromPoint,
    duration: 0.62,
    loop: false,
    loopDelay: 0,
    size: 104,
    showTrail: false,
    hideOnComplete: true,
    zIndex: 30
  });

  handTutorial.play();
  tutorialPhase = 'tap-source';
  tutorialPhaseStartMs = performance.now();
}

function updateHandTutorial(now) {
  if (!handTutorial || !gameStarted || gameEnded) {
    return;
  }

  handTutorial.update(now);
  const elapsed = (now - tutorialPhaseStartMs) / 1000;

  if (tutorialPhase === 'tap-source' && elapsed >= 0.75) {
    handTutorial.setConfig({
      gesture: 'drag',
      from: tutorialFromPoint,
      to: tutorialToPoint,
      duration: 0.95,
      loop: false,
      loopDelay: 0,
      showTrail: true,
      followDirection: true,
      hideOnComplete: false
    });
    handTutorial.play();
    tutorialPhase = 'move-to-target';
    tutorialPhaseStartMs = now;
    return;
  }

  if (tutorialPhase === 'move-to-target' && elapsed >= 1.05) {
    handTutorial.setConfig({
      gesture: 'tap',
      from: tutorialToPoint,
      to: tutorialToPoint,
      duration: 0.62,
      loop: false,
      loopDelay: 0,
      showTrail: false,
      hideOnComplete: true
    });
    handTutorial.play();
    tutorialPhase = 'tap-destination';
    tutorialPhaseStartMs = now;
    return;
  }

  if (tutorialPhase === 'tap-destination' && elapsed >= 0.78) {
    stopFirstMoveTutorial();
    tutorialPhase = 'done';
  }
}

function stopFirstMoveTutorial() {
  if (!handTutorial) {
    return;
  }
  handTutorial.destroy();
  handTutorial = null;
}

function buildBoard() {
  const floor = new THREE.Mesh(
    new THREE.CylinderGeometry(8.5, 9.4, 0.9, 48),
    new THREE.MeshStandardMaterial({ color: 0x1d2332, roughness: 0.75, metalness: 0.2 })
  );
  floor.position.set(0, -0.45, 0);
  scene.add(floor);

  const colorById = new Map(COLORS.map((item) => [item.id, item.hex]));

  for (let i = 0; i < STICK_COUNT; i++) {
    const { x, z } = STICK_LAYOUT[i];
    board.stickPositions.push({ x, z });

    const stand = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 0.12, 3.1, 16),
      new THREE.MeshStandardMaterial({ color: 0xc5cad8, roughness: 0.28, metalness: 0.6 })
    );
    stand.position.set(x, 1.55, z);
    scene.add(stand);

    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(0.95, 1.05, 0.25, 24),
      new THREE.MeshStandardMaterial({ color: 0x343d55, roughness: 0.7, metalness: 0.1 })
    );
    base.position.set(x, 0.05, z);
    scene.add(base);

    const hitArea = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 4.2, 14),
      new THREE.MeshBasicMaterial({ transparent: true, opacity: 0.0 })
    );
    hitArea.position.set(x, 2.1, z);
    hitArea.userData.stickIndex = i;
    scene.add(hitArea);
    board.sticks.push(hitArea);

    for (let level = 0; level < board.stackData[i].length; level++) {
      const colorId = board.stackData[i][level];
      const disc = new THREE.Mesh(
        new THREE.CylinderGeometry(DISC_RADIUS, DISC_RADIUS, DISC_HEIGHT, 48),
        new THREE.MeshStandardMaterial({
          color: colorById.get(colorId),
          roughness: 0.45,
          metalness: 0.1,
          emissive: 0x000000
        })
      );
      disc.position.set(x, discYForLevel(level), z);
      disc.userData.colorId = colorId;
      disc.userData.stickIndex = i;
      disc.userData.level = level;
      scene.add(disc);
      board.discs.push(disc);
    }
  }
}

function discYForLevel(level) {
  return BASE_Y + level * STACK_GAP;
}

function renderStacks() {
  for (let stickIndex = 0; stickIndex < STICK_COUNT; stickIndex++) {
    const stackColors = board.stackData[stickIndex];
    const stackDiscs = board.discs
      .filter((disc) => disc.userData.stickIndex === stickIndex)
      .sort((a, b) => a.userData.level - b.userData.level);

    for (let level = 0; level < stackDiscs.length; level++) {
      const disc = stackDiscs[level];
      const { x, z } = board.stickPositions[stickIndex];
      disc.userData.level = level;
      disc.position.set(x, discYForLevel(level), z);
      disc.userData.colorId = stackColors[level];
      disc.material.emissive.setHex(0x000000);
    }
  }
}

function onPointerDown(event) {
  if (!gameStarted || gameEnded || activeMove) {
    return;
  }

  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
  raycaster.setFromCamera(mouse, camera);

  const hitTargets = [...board.discs, ...board.sticks];
  const hits = raycaster.intersectObjects(hitTargets, false);
  if (hits.length === 0) {
    clearSelection();
    return;
  }

  const hitObject = hits[0].object;
  const clickedCircle = board.discs.includes(hitObject);
  const targetStick = hitObject.userData.stickIndex;

  if (selectedStickIndex === null) {
    if (board.stackData[targetStick].length > 0) {
      selectStick(targetStick);
    }
    return;
  }

  if (selectedStickIndex === targetStick) {
    clearSelection();
    return;
  }

  if (clickedCircle) {
    if (board.stackData[targetStick].length > 0) {
      selectStick(targetStick);
    } else {
      clearSelection();
    }
    return;
  }

  tryMove(selectedStickIndex, targetStick);
}

function tryMove(fromStick, toStick) {
  const fromStack = board.stackData[fromStick];
  const toStack = board.stackData[toStick];

  if (fromStack.length === 0) {
    clearSelection();
    return;
  }

  const movingColor = fromStack[fromStack.length - 1];
  const targetTopColor = toStack[toStack.length - 1];
  const canMove = toStack.length === 0 || targetTopColor === movingColor;

  if (!canMove) {
    clearSelection();
    return;
  }

  const movingDisc = getTopDisc(fromStick);
  if (!movingDisc) {
    clearSelection();
    return;
  }

  activeMove = {
    disc: movingDisc,
    fromStick,
    toStick,
    color: movingColor,
    phase: 'lift',
    targetLiftY: 3.9,
    targetDropY: discYForLevel(toStack.length),
    speed: 6.5
  };
}

function getTopDisc(stickIndex) {
  let best = null;
  for (const disc of board.discs) {
    if (disc.userData.stickIndex !== stickIndex) {
      continue;
    }
    if (!best || disc.userData.level > best.userData.level) {
      best = disc;
    }
  }
  return best;
}

function updateMove(delta) {
  if (!activeMove) {
    return;
  }

  const move = activeMove;
  const disc = move.disc;
  const targetPos = board.stickPositions[move.toStick];
  const liftY = move.targetLiftY;

  if (move.phase === 'lift') {
    disc.position.y = Math.min(liftY, disc.position.y + move.speed * delta);
    if (disc.position.y >= liftY - 0.01) {
      move.phase = 'slide';
    }
    return;
  }

  if (move.phase === 'slide') {
    const current = new THREE.Vector3(disc.position.x, 0, disc.position.z);
    const target = new THREE.Vector3(targetPos.x, 0, targetPos.z);
    const toTarget = target.clone().sub(current);
    const step = move.speed * 1.6 * delta;

    if (toTarget.length() <= step) {
      disc.position.x = targetPos.x;
      disc.position.z = targetPos.z;
      move.phase = 'drop';
    } else {
      toTarget.normalize().multiplyScalar(step);
      disc.position.x += toTarget.x;
      disc.position.z += toTarget.z;
    }
    return;
  }

  disc.position.y = Math.max(move.targetDropY, disc.position.y - move.speed * delta);
  if (disc.position.y <= move.targetDropY + 0.01) {
    finalizeMove();
  }
}

function finalizeMove() {
  const move = activeMove;
  if (!move) {
    return;
  }

  board.stackData[move.fromStick].pop();
  board.stackData[move.toStick].push(move.color);
  const { x, z } = board.stickPositions[move.toStick];

  move.disc.userData.stickIndex = move.toStick;
  move.disc.userData.level = board.stackData[move.toStick].length - 1;
  move.disc.position.set(x, discYForLevel(move.disc.userData.level), z);

  spawnMoveParticles(move.disc.position);
  clearSelection();
  activeMove = null;

  if (tutorialPhase !== 'done') {
    stopFirstMoveTutorial();
    tutorialPhase = 'done';
  }

  if (isSolved()) {
    endGame(true);
  }
}

function isSolved() {
  const colorToStick = new Map();

  for (const stack of board.stackData) {
    if (stack.length === 0) {
      continue;
    }

    const color = stack[0];
    for (let i = 1; i < stack.length; i++) {
      if (stack[i] !== color) {
        return false;
      }
    }

    if (colorToStick.has(color)) {
      return false;
    }
    colorToStick.set(color, true);
  }

  for (const color of COLORS) {
    if (!colorToStick.has(color.id)) {
      return false;
    }
  }

  return true;
}

function highlightTopDisc(stickIndex, on) {
  const disc = getTopDisc(stickIndex);
  if (!disc) {
    return null;
  }
  disc.material.emissive.setHex(on ? 0x223344 : 0x000000);
  return disc;
}

function selectStick(stickIndex) {
  clearSelection();
  const topDisc = highlightTopDisc(stickIndex, true);
  if (!topDisc) {
    return;
  }
  selectedStickIndex = stickIndex;
  selectedDisc = topDisc;
}

function pulseSelection() {
  if (!selectedDisc || activeMove) {
    return;
  }

  const pulse = 0.4 + Math.sin(performance.now() * 0.01) * 0.25;
  selectedDisc.material.emissive.setRGB(0.1 * pulse, 0.22 * pulse, 0.42 * pulse);
}

function clearSelection() {
  if (selectedDisc) {
    selectedDisc.material.emissive.setHex(0x000000);
    selectedDisc = null;
  }
  selectedStickIndex = null;
}

function updateTimer(delta) {
  if (!gameStarted || gameEnded || !gameTimer) {
    return;
  }
  gameTimer.update(delta);
}

function endGame(isWin) {
  if (gameEnded) {
    return;
  }

  gameEnded = true;
  activeMove = null;
  clearSelection();
  bgm.stop();
  stopFirstMoveTutorial();
  if (gameTimer) {
    gameTimer.destroy();
    gameTimer = null;
  }

  ui.endTitle.textContent = isWin ? 'You Win!' : 'Time Is Up!';
  ui.endOverlay.classList.add('visible');
}

function spawnMoveParticles(position) {
  for (let i = 0; i < 12; i++) {
    const p = particlePool.get();
    p.position.copy(position);
    p.position.y += 0.15;
    p.visible = true;

    p.userData.velocity.set(
      (Math.random() - 0.5) * 4.2,
      Math.random() * 4.5,
      (Math.random() - 0.5) * 2.8
    );
    p.userData.maxLife = 0.28 + Math.random() * 0.24;
    p.userData.life = 0;
    activeParticles.push(p);
  }
}

function updateParticles(delta) {
  for (let i = activeParticles.length - 1; i >= 0; i--) {
    const p = activeParticles[i];
    p.userData.life += delta;

    if (p.userData.life >= p.userData.maxLife) {
      particlePool.release(p);
      activeParticles.splice(i, 1);
      continue;
    }

    p.position.addScaledVector(p.userData.velocity, delta);
    p.userData.velocity.y -= 12 * delta;

    const scale = 1 - p.userData.life / p.userData.maxLife;
    p.scale.set(scale, scale, scale);
    p.material.opacity = scale;
  }
}
