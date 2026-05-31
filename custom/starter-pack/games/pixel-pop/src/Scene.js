import * as THREE from 'three';
import './components/HandTutorial.js';
import { PixelGrid } from './game/PixelGrid.js';
import { PathTrack } from './game/PathTrack.js';
import { ShooterFactory } from './game/ShooterFactory.js';
import { BulletFactory } from './game/BulletFactory.js';
import { ShooterQueueSystem } from './game/ShooterQueueSystem.js';
import { GameHUD } from './ui/GameHUD.js';

const HAND_ICON_SVG = [
    '<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128">',
    '<circle cx="64" cy="64" r="61" fill="#ffffff" fill-opacity="0.08"/>',
    '<path d="M51 106c-10-10-15-23-15-36 0-9 5-15 11-15 5 0 8 3 10 7V30c0-5 4-9 9-9s9 4 9 9v21h2V35c0-5 4-9 9-9s9 4 9 9v20h2V43c0-5 4-9 9-9s9 4 9 9v34c0 24-16 43-41 43H74c-9 0-17-5-23-14z" fill="#ffffff"/>',
    '</svg>'
].join('');

function createDefaultPixelArt(size) {
    const palette = [0x08111f, 0x1f3b73, 0x2f67c8, 0x54bdf7, 0xaef3ff];
    const pixels = [];
    const center = (size - 1) / 2;

    for (let row = 0; row < size; row += 1) {
        const line = [];

        for (let col = 0; col < size; col += 1) {
            const dx = Math.abs(col - center);
            const dy = Math.abs(row - center);
            const ring = Math.min(palette.length - 1, Math.floor(Math.max(dx, dy)));
            const diagonalGlow = Math.abs(dx - dy) < 0.6 ? 1 : 0;

            line.push(palette[Math.min(palette.length - 1, ring + diagonalGlow)]);
        }

        pixels.push(line);
    }

    return pixels;
}

function countPixelColors(pixelArt) {
    const totals = new Map();

    for (let row = 0; row < pixelArt.length; row += 1) {
        for (let col = 0; col < pixelArt[row].length; col += 1) {
            const color = pixelArt[row][col];
            totals.set(color, (totals.get(color) || 0) + 1);
        }
    }

    return totals;
}

function splitTotalAcrossSlots(total, slotCount) {
    const values = [];
    const baseValue = Math.floor(total / slotCount);
    let remainder = total % slotCount;

    for (let index = 0; index < slotCount; index += 1) {
        const nextValue = baseValue + (remainder > 0 ? 1 : 0);
        values.push(nextValue);
        remainder -= remainder > 0 ? 1 : 0;
    }

    return values;
}

function shuffleArray(values) {
    const result = values.slice();

    for (let index = result.length - 1; index > 0; index -= 1) {
        const swapIndex = Math.floor(Math.random() * (index + 1));
        const temp = result[index];

        result[index] = result[swapIndex];
        result[swapIndex] = temp;
    }

    return result;
}

export class PixelPopScene {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.lastFrameTime = performance.now();

        this.grid = null;
        this.path = null;
        this.shooterPool = null;
        this.bulletPool = null;
        this.queueSystem = null;
        this.hud = null;
        this.handTutorial = null;
        this.queueTutorialShown = false;
        this.bucketTutorialShown = false;
        this.activeTutorialMode = null;

        this.activeRuns = [];
        this.gameState = 'playing';
        this.pointer = new THREE.Vector2();
        this.raycaster = new THREE.Raycaster();

        this.animate = this.animate.bind(this);
        this.onResize = this.onResize.bind(this);
        this.onPointerDown = this.onPointerDown.bind(this);
    }

    build() {
        this.setupDocument();
        this.setupRenderer();
        this.setupWorld();
        this.setupGameplay();
        this.setupHUD();
        this.setupTutorial();
        this.bindEvents();
        this.animate();
    }

    setupDocument() {
        Object.assign(document.body.style, {
            margin: '0',
            overflow: 'hidden',
            background: 'radial-gradient(circle at top, #152545 0%, #08111f 50%, #04070d 100%)'
        });
    }

    setupRenderer() {
        this.scene = new THREE.Scene();
        this.scene.fog = new THREE.Fog(0x08111f, 16, 45);

        this.camera = new THREE.PerspectiveCamera(42, window.innerWidth / window.innerHeight, 0.1, 100);
        this.camera.position.set(0, 1.4, 18);
        this.camera.lookAt(0, 0, 0);

        this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.outputColorSpace = THREE.SRGBColorSpace;
        this.renderer.domElement.style.touchAction = 'none';
        document.body.appendChild(this.renderer.domElement);
    }

    setupWorld() {
        const ambient = new THREE.AmbientLight(0xffffff, 1.1);
        this.scene.add(ambient);

        const key = new THREE.DirectionalLight(0xd2e2ff, 1.8);
        key.position.set(-3, 7, 9);
        this.scene.add(key);

        const fill = new THREE.DirectionalLight(0xffc77d, 0.65);
        fill.position.set(4, -1, 8);
        this.scene.add(fill);

        const backdrop = new THREE.Mesh(
            new THREE.PlaneGeometry(44, 32),
            new THREE.MeshBasicMaterial({ color: 0x07111e, transparent: true, opacity: 0.95 })
        );
        backdrop.position.set(0, 0, -8);
        this.scene.add(backdrop);

        const stars = new THREE.Group();
        const starGeometry = new THREE.SphereGeometry(0.03, 8, 8);
        const starMaterial = new THREE.MeshBasicMaterial({ color: 0xb9ccff });

        for (let index = 0; index < 60; index += 1) {
            const star = new THREE.Mesh(starGeometry, starMaterial);
            star.position.set((Math.random() - 0.5) * 36, (Math.random() - 0.5) * 20, -7.5 - Math.random() * 2);
            star.scale.setScalar(0.5 + Math.random() * 1.6);
            stars.add(star);
        }

        this.scene.add(stars);
    }

    setupGameplay() {
        const pixelArt = createDefaultPixelArt(9);
        const pixelTotals = countPixelColors(pixelArt);

        this.grid = new PixelGrid(this.scene, {
            rows: 9,
            cols: 9,
            cellSize: 0.6,
            gap: 0.055,
            position: { x: 0, y: 1.85, z: 0 },
            pixels: pixelArt,
            onCellDestroyed: () => {
                this.hud?.setProgress(this.grid.remainingCount, this.grid.totalCount);

                if (this.grid.remainingCount === 0) {
                    this.endGame(true);
                }
            }
        });

        this.path = new PathTrack({
            center: { x: 0, y: 1.85, z: 0.8 },
            width: this.grid.bounds.width + 2.8,
            height: this.grid.bounds.height + 2.8,
            railHeight: 0.26,
            railThickness: 0.18
        });

        this.scene.add(this.path.group);

        this.shooterPool = ShooterFactory.createPool(this.scene, 24);
        this.bulletPool = BulletFactory.createPool(this.scene, 80);

        this.queueSystem = new ShooterQueueSystem(this.scene, {
            shooterPool: this.shooterPool,
            queueCount: 4,
            bucketSize: 5,
            queueLength: 4,
            queueAnchorY: -5.95,
            bucketAnchorY: -6.3,
            onSelectShooter: (shooter) => this.launchShooter(shooter)
        });

        this.populateQueues(pixelTotals);
    }

    populateQueues(pixelTotals) {
        const queueColors = [0x1f3b73, 0x2f67c8, 0x54bdf7, 0xaef3ff];
        const bulletsByColor = queueColors.map((color) => splitTotalAcrossSlots(pixelTotals.get(color) || 0, this.queueSystem.queueCount));

        for (let queueIndex = 0; queueIndex < this.queueSystem.queueCount; queueIndex += 1) {
            const colorOrder = shuffleArray(queueColors);

            for (let slotIndex = 0; slotIndex < this.queueSystem.queueLength; slotIndex += 1) {
                const shooter = this.shooterPool.get();
                const color = colorOrder[slotIndex % colorOrder.length];
                const colorIndex = queueColors.indexOf(color);

                ShooterFactory.configure(shooter, {
                    bulletsRemaining: bulletsByColor[colorIndex][queueIndex],
                    color: color,
                    label: bulletsByColor[colorIndex][queueIndex]
                });
                this.queueSystem.addShooterToQueue(queueIndex, shooter);
            }
        }

        this.queueSystem.layout();
    }

    setupHUD() {
        this.hud = new GameHUD();
        this.hud.setProgress(this.grid.remainingCount, this.grid.totalCount);
        this.hud.setBucket(this.queueSystem.bucketCount, this.queueSystem.bucketSize);
        this.hud.setQueueInfo(this.queueSystem.getQueueCounts());
        this.hud.setMessage('Tap the front shooter in any queue. Clear the outer pixels first to expose the core.');
    }

    setupTutorial() {
        this.showQueueTutorial();
    }

    bindEvents() {
        window.addEventListener('resize', this.onResize);
        this.renderer.domElement.addEventListener('pointerdown', this.onPointerDown);
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
    }

    onPointerDown(event) {
        if (this.gameState !== 'playing') {
            return;
        }

        const rect = this.renderer.domElement.getBoundingClientRect();
        this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        this.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);

        this.raycaster.setFromCamera(this.pointer, this.camera);

        const pickables = this.queueSystem.getInteractiveMeshes();
        const hits = this.raycaster.intersectObjects(pickables, true);

        if (!hits.length) {
            return;
        }

        const target = this.queueSystem.resolveMesh(hits[0].object);

        if (target) {
            this.launchShooter(target);
        }
    }

    launchShooter(shooter) {
        if (this.gameState !== 'playing' || !shooter) {
            return;
        }

        if (this.activeRuns.length >= 5) {
            this.hud?.setMessage('Only five shooters can move at once. Wait for one to finish before launching another.');
            return;
        }

        const removed = this.queueSystem.detachShooter(shooter);

        if (!removed) {
            return;
        }

        if (removed.source === 'queue') {
            this.queueTutorialShown = true;
            if (this.activeTutorialMode === 'queue') {
                this.stopTutorial();
            }
        } else if (removed.source === 'bucket' && this.activeTutorialMode === 'bucket') {
            this.bucketTutorialShown = true;
            this.stopTutorial();
        }

        const launchDistance = this.path.distanceAtBottomX(shooter.position.x);

        shooter.userData.run = {
            distance: launchDistance,
            fireCooldown: 0,
            source: removed.source,
            hasEnteredBucket: false
        };

        shooter.position.copy(this.path.getPointAtDistance(launchDistance));
        shooter.position.z = 1.1;
        shooter.visible = true;
        shooter.userData.active = true;
        shooter.userData.interactive = false;
        this.activeRuns.push(shooter);
    }

    updateActiveShooter(shooter, delta) {
        const run = shooter.userData.run;

        if (!run) {
            return;
        }

        run.distance += shooter.userData.speed * delta;
        run.fireCooldown = Math.max(0, run.fireCooldown - delta);

        const state = this.path.getStateAtDistance(run.distance);
        const point = this.path.getPointAtDistance(run.distance);

        shooter.position.set(point.x, point.y, 1.1 + Math.sin(run.distance * 0.05) * 0.05);
        shooter.rotation.z = state.angle + Math.PI / 2;

        if (run.fireCooldown <= 0 && shooter.userData.bulletsRemaining > 0) {
            const targetCell = this.grid.findTargetForShot(state.side, shooter.position, shooter.userData.color);

            if (targetCell) {
                this.fireBullet(shooter, targetCell);
                shooter.userData.bulletsRemaining -= 1;
                ShooterFactory.setLabel(shooter, shooter.userData.bulletsRemaining);
                run.fireCooldown = 0.28;

                if (shooter.userData.bulletsRemaining <= 0) {
                    this.finishShooter(shooter);
                    return;
                }
            }
        }

        if (run.distance >= this.path.perimeter) {
            this.completeTour(shooter);
        }
    }

    fireBullet(shooter, targetCell) {
        const bullet = this.bulletPool.get();

        BulletFactory.launch(bullet, {
            from: shooter.position,
            to: targetCell.position,
            color: shooter.userData.color,
            onImpact: () => {
                this.grid.destroyCell(targetCell);
            }
        });
    }

    finishShooter(shooter) {
        const index = this.activeRuns.indexOf(shooter);

        if (index !== -1) {
            this.activeRuns.splice(index, 1);
        }

        shooter.userData.run = null;
        shooter.userData.active = false;
        ShooterFactory.release(shooter, this.shooterPool);
        this.queueSystem.layout();
        this.hud.setQueueInfo(this.queueSystem.getQueueCounts());
        this.hud.setBucket(this.queueSystem.bucketCount, this.queueSystem.bucketSize);
    }

    completeTour(shooter) {
        const remainingBullets = shooter.userData.bulletsRemaining;
        const source = shooter.userData.run?.source || 'queue';

        const index = this.activeRuns.indexOf(shooter);

        if (index !== -1) {
            this.activeRuns.splice(index, 1);
        }

        shooter.userData.run = null;
        shooter.userData.active = false;

        if (remainingBullets > 0) {
            const added = this.queueSystem.addToBucket(shooter);

            if (!added) {
                this.endGame(false, 'Bucket full');
                return;
            }

            this.hud.setMessage('Shooter stored in the bucket. Tap it again for another pass.');
            this.queueSystem.layout();
            this.hud.setBucket(this.queueSystem.bucketCount, this.queueSystem.bucketSize);
            this.hud.setQueueInfo(this.queueSystem.getQueueCounts());

            if (!this.bucketTutorialShown && this.queueSystem.bucketSlots.length > 0) {
                this.showBucketTutorial();
            }
            return;
        }

        ShooterFactory.release(shooter, this.shooterPool);
        this.queueSystem.layout();
        this.hud.setQueueInfo(this.queueSystem.getQueueCounts());
        this.hud.setBucket(this.queueSystem.bucketCount, this.queueSystem.bucketSize);

        if (source === 'bucket') {
            this.hud.setMessage('A bucket shooter spent every bullet and returned to the pool.');
        }
    }

    showHandTutorialForShooter(shooter, mode) {
        if (!shooter || !window.HandTutorial) {
            return;
        }

        const handUrl = `data:image/svg+xml;utf8,${encodeURIComponent(HAND_ICON_SVG)}`;
        const projected = shooter.position.clone().project(this.camera);
        const screenPoint = {
            space: 'screen',
            x: projected.x * 0.5 + 0.5,
            y: (-projected.y * 0.5) + 0.5
        };

        this.stopTutorial();
        this.activeTutorialMode = mode;

        this.handTutorial = new window.HandTutorial({
            container: document.body,
            renderer: this.renderer,
            camera: this.camera,
            assetUrl: handUrl,
            gesture: 'tap',
            from: screenPoint,
            duration: 1.2,
            loop: true,
            zIndex: 12,
            size: 136,
            opacity: 0.95
        });

        this.handTutorial.play();
    }

    showQueueTutorial() {
        if (this.queueTutorialShown) {
            return;
        }

        const firstQueueHitArea = this.queueSystem.queueSlots[0]?.hitArea || null;
        this.showHandTutorialForShooter(firstQueueHitArea, 'queue');
    }

    showBucketTutorial() {
        if (this.bucketTutorialShown) {
            return;
        }

        const firstBucketShooter = this.queueSystem.bucketSlots[0] || null;
        this.bucketTutorialShown = Boolean(firstBucketShooter);
        this.showHandTutorialForShooter(firstBucketShooter, 'bucket');
    }

    stopTutorial() {
        if (this.handTutorial) {
            this.handTutorial.stop();
            this.handTutorial.destroy();
            this.handTutorial = null;
        }

        this.activeTutorialMode = null;
    }

    endGame(isWin, reason = '') {
        if (this.gameState !== 'playing') {
            return;
        }

        this.gameState = isWin ? 'won' : 'lost';
        this.stopTutorial();

        if (isWin) {
            this.hud.showEnd('Image destroyed', 'The pixel core has been cleared.', 'PLAY NOW', () => {
                window.open('https://www.google.com', '_blank');
            });
        } else {
            this.hud.showEnd('You lost', reason || 'The bucket overflowed before the image was cleared.', 'TRY AGAIN', () => {
                window.location.reload();
            });
        }
    }

    animate() {
        const now = performance.now();
        const delta = Math.min((now - this.lastFrameTime) / 1000, 0.05);
        this.lastFrameTime = now;

        if (this.gameState === 'playing') {
            this.grid.update(delta);
            BulletFactory.update(this.bulletPool, delta);

            for (let index = 0; index < this.activeRuns.length; index += 1) {
                this.updateActiveShooter(this.activeRuns[index], delta);
            }

            this.queueSystem.update(delta);
            this.hud.setProgress(this.grid.remainingCount, this.grid.totalCount);
            this.hud.setBucket(this.queueSystem.bucketCount, this.queueSystem.bucketSize);
            this.hud.setQueueInfo(this.queueSystem.getQueueCounts());
        } else {
            this.grid.update(delta);
            BulletFactory.update(this.bulletPool, delta);
        }

        if (this.handTutorial && this.gameState === 'playing') {
            this.handTutorial.update(performance.now());
        }

        this.renderer.render(this.scene, this.camera);
        requestAnimationFrame(this.animate);
    }

    destroy() {
        this.stopTutorial();
        window.removeEventListener('resize', this.onResize);
        this.renderer?.domElement?.removeEventListener('pointerdown', this.onPointerDown);
        this.hud?.destroy();
    }
}