import { LoadedImages } from '../assets';
import { GAME_CONFIG } from '../config';
import { createInitialGameState, GameState } from './GameState';
import {
  collapseBlastedCells,
  clampObjectIndex,
  createGridCells,
  findMatchingGroup,
  getCellAtPoint,
  GridCell
} from './grid';
import { calculateViewportLayout, ViewportLayout } from './sizing';

interface BlastParticle {
  angle: number;
  distance: number;
  size: number;
  color: string;
}

interface BlastEffect {
  x: number;
  y: number;
  elapsedSeconds: number;
  durationSeconds: number;
  particles: BlastParticle[];
}

interface GameCallbacks {
  onHudChange: (state: GameState) => void;
  onBlast: () => void;
  onEnd: (state: GameState) => void;
}

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly images: LoadedImages;
  private readonly callbacks: GameCallbacks;
  private readonly targetObjectIndex: number;
  private cells: GridCell[];
  private state = createInitialGameState();
  private layout: ViewportLayout;
  private animationFrame = 0;
  private lastTime = 0;
  private blastEffects: BlastEffect[] = [];

  constructor(canvas: HTMLCanvasElement, images: LoadedImages, callbacks: GameCallbacks) {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas 2D context is not available');
    }

    this.canvas = canvas;
    this.context = context;
    this.images = images;
    this.callbacks = callbacks;
    this.targetObjectIndex = clampObjectIndex(GAME_CONFIG.gameplay.targetObjectIndex, images.objects.length);
    this.state.targetObjectIndex = this.targetObjectIndex;
    this.cells = createGridCells(this.images.objects.length, this.targetObjectIndex);
    this.layout = calculateViewportLayout(canvas, window.innerWidth, window.innerHeight);
  }

  getLayout(): ViewportLayout {
    return this.layout;
  }

  markReady(): void {
    this.state.status = 'ready';
    this.lastTime = performance.now();
    this.callbacks.onHudChange(this.state);
    this.loop(this.lastTime);
  }

  start(): void {
    if (this.state.status === 'playing') return;

    cancelAnimationFrame(this.animationFrame);
    this.state = createInitialGameState();
    this.state.status = 'playing';
    this.state.targetObjectIndex = this.targetObjectIndex;
    this.blastEffects = [];
    this.lastTime = performance.now();
    this.callbacks.onHudChange(this.state);
    this.loop(this.lastTime);
  }

  pause(): void {
    if (this.state.status !== 'playing') return;
    this.state.status = 'paused';
    cancelAnimationFrame(this.animationFrame);
  }

  resume(): void {
    if (this.state.status !== 'paused') return;
    this.state.status = 'playing';
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  finish(): void {
    if (this.state.status === 'ended') return;
    this.state.status = 'ended';
    cancelAnimationFrame(this.animationFrame);
    this.render();
    this.callbacks.onHudChange(this.state);
    this.callbacks.onEnd(this.state);
  }

  resize(width: number, height: number): void {
    this.layout = calculateViewportLayout(this.canvas, width, height);

    if (this.canvas.width !== this.layout.pixelWidth) {
      this.canvas.width = this.layout.pixelWidth;
    }

    if (this.canvas.height !== this.layout.pixelHeight) {
      this.canvas.height = this.layout.pixelHeight;
    }

    this.render();
  }

  handleTap(x: number, y: number): boolean {
    if (this.state.status === 'ended' || this.state.status === 'paused') return false;

    const cell = getCellAtPoint(this.cells, x, y);

    if (!cell || this.isBoardSettling()) return false;

    if (this.state.status === 'ready') {
      this.start();
    }

    const group = findMatchingGroup(this.cells, cell);

    if (group.length >= GAME_CONFIG.gameplay.minBlastGroupSize) {
      this.blastGroup(group);
    }

    return true;
  }

  private loop = (time: number): void => {
    if (this.state.status !== 'playing' && this.state.status !== 'ready') return;

    const deltaSeconds = Math.min(0.033, (time - this.lastTime) / 1000);
    this.lastTime = time;

    if (this.state.status === 'playing') {
      this.update(deltaSeconds);
    } else {
      this.updateBlastEffects(deltaSeconds);
      this.updateObjectMotion(deltaSeconds);
    }

    this.render();
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private update(deltaSeconds: number): void {
    this.state.elapsedSeconds += deltaSeconds;
    this.updateRemainingSeconds();
    this.updateObjectMotion(deltaSeconds);
    this.updateBlastEffects(deltaSeconds);
    this.callbacks.onHudChange(this.state);

    if (this.state.remainingSeconds <= 0) {
      this.finish();
    }
  }

  private blastGroup(group: GridCell[]): void {
    const targetHits = group.filter((cell) => cell.objectIndex === this.targetObjectIndex).length;

    this.state.targetRemaining = Math.max(0, this.state.targetRemaining - targetHits);
    this.blastEffects.push(...group.map((cell) => this.createBlastEffect(cell)));
    this.callbacks.onBlast();

    if (this.state.targetRemaining <= 0) {
      this.callbacks.onHudChange(this.state);
      this.finish();
      return;
    }

    collapseBlastedCells(this.cells, group, this.images.objects.length, this.targetObjectIndex, this.state.targetRemaining);
    this.callbacks.onHudChange(this.state);
  }

  private updateRemainingSeconds(): void {
    this.state.remainingSeconds = Math.max(0, GAME_CONFIG.gameplay.durationSeconds - this.state.elapsedSeconds);
  }

  private createBlastEffect(cell: GridCell): BlastEffect {
    const particles: BlastParticle[] = [];

    for (let index = 0; index < GAME_CONFIG.blast.particleCount; index += 1) {
      particles.push({
        angle: (Math.PI * 2 * index) / GAME_CONFIG.blast.particleCount + Math.random() * 0.24,
        distance: GAME_CONFIG.blast.particleDistance * (0.72 + Math.random() * 0.42),
        size: GAME_CONFIG.blast.particleSize * (0.55 + Math.random() * 0.9),
        color: GAME_CONFIG.blast.particleColors[index % GAME_CONFIG.blast.particleColors.length]
      });
    }

    return {
      x: cell.x + cell.width / 2,
      y: cell.objectY,
      elapsedSeconds: 0,
      durationSeconds: GAME_CONFIG.blast.durationMs / 1000,
      particles
    };
  }

  private updateObjectMotion(deltaSeconds: number): void {
    const maxDistance = GAME_CONFIG.grid.fallSpeed * deltaSeconds;

    for (const cell of this.cells) {
      const targetY = this.getCellCenterY(cell);
      const distance = targetY - cell.objectY;

      if (Math.abs(distance) <= maxDistance) {
        cell.objectY = targetY;
      } else {
        cell.objectY += Math.sign(distance) * maxDistance;
      }
    }
  }

  private updateBlastEffects(deltaSeconds: number): void {
    for (let index = this.blastEffects.length - 1; index >= 0; index -= 1) {
      const effect = this.blastEffects[index];
      effect.elapsedSeconds += deltaSeconds;

      if (effect.elapsedSeconds >= effect.durationSeconds) {
        this.blastEffects.splice(index, 1);
      }
    }
  }

  private render(): void {
    const { context } = this;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.clearRect(0, 0, this.canvas.width, this.canvas.height);
    context.fillStyle = GAME_CONFIG.stage.backgroundFill;
    context.fillRect(0, 0, this.canvas.width, this.canvas.height);
    context.setTransform(this.layout.scale, 0, 0, this.layout.scale, this.layout.offsetX, this.layout.offsetY);

    const background = this.state.status === 'ended' ? this.images.endBackground : this.images.background;
    context.drawImage(background, 0, 0, GAME_CONFIG.stage.width, GAME_CONFIG.stage.height);

    if (this.state.status !== 'ended') {
      this.renderGrid();
      this.renderBlastEffects();
    }
  }

  private renderGrid(): void {
    for (const cell of this.cells) {
      this.renderCell(cell);
    }

    this.context.save();
    this.context.beginPath();
    this.context.rect(GAME_CONFIG.grid.x, GAME_CONFIG.grid.y, GAME_CONFIG.grid.width, GAME_CONFIG.grid.height);
    this.context.clip();

    for (const cell of this.cells) {
      this.renderObject(cell);
    }

    this.context.restore();
  }

  private renderCell(cell: GridCell): void {
    const { context } = this;

    context.save();
    context.shadowColor = GAME_CONFIG.grid.cellShadowColor;
    context.shadowBlur = 12;
    context.shadowOffsetY = 8;
    context.fillStyle = GAME_CONFIG.grid.cellFillColor;
    context.strokeStyle = GAME_CONFIG.grid.cellStrokeColor;
    context.lineWidth = GAME_CONFIG.grid.cellStrokeWidth;
    this.drawRoundedRect(cell.x, cell.y, cell.width, cell.height, GAME_CONFIG.grid.cellRadius);
    context.fill();
    context.stroke();
    context.restore();
  }

  private renderObject(cell: GridCell): void {
    this.drawObject(cell.objectIndex, cell.x + cell.width / 2, cell.objectY, GAME_CONFIG.grid.objectSize);
  }

  private renderBlastEffects(): void {
    for (const effect of this.blastEffects) {
      const progress = Math.min(1, effect.elapsedSeconds / effect.durationSeconds);
      const alpha = 1 - progress;

      this.renderBlastRing(effect, progress, alpha);
      this.renderBlastParticles(effect, progress, alpha);
    }
  }

  private renderBlastRing(effect: BlastEffect, progress: number, alpha: number): void {
    const radius = GAME_CONFIG.blast.ringStartRadius + (GAME_CONFIG.blast.ringEndRadius - GAME_CONFIG.blast.ringStartRadius) * progress;

    this.context.save();
    this.context.globalAlpha = alpha;
    this.context.strokeStyle = GAME_CONFIG.blast.ringColor;
    this.context.lineWidth = GAME_CONFIG.blast.ringWidth * (1 - progress * 0.45);
    this.context.shadowColor = GAME_CONFIG.blast.ringColor;
    this.context.shadowBlur = 16;
    this.context.beginPath();
    this.context.arc(effect.x, effect.y, radius, 0, Math.PI * 2);
    this.context.stroke();
    this.context.restore();
  }

  private renderBlastParticles(effect: BlastEffect, progress: number, alpha: number): void {
    this.context.save();
    this.context.globalAlpha = alpha;
    this.context.shadowBlur = 10;

    for (const particle of effect.particles) {
      const easedProgress = 1 - Math.pow(1 - progress, 2);
      const distance = particle.distance * easedProgress;
      const x = effect.x + Math.cos(particle.angle) * distance;
      const y = effect.y + Math.sin(particle.angle) * distance;
      const size = particle.size * (1 - progress * 0.45);

      this.context.fillStyle = particle.color;
      this.context.shadowColor = particle.color;
      this.context.beginPath();
      this.context.arc(x, y, size, 0, Math.PI * 2);
      this.context.fill();
    }

    this.context.restore();
  }

  private drawObject(objectIndex: number, centerX: number, centerY: number, size: number): void {
    const image = this.images.objects[objectIndex % this.images.objects.length];

    this.context.save();
    this.context.translate(centerX, centerY);
    this.context.drawImage(image, -size / 2, -size / 2, size, size);
    this.context.restore();
  }

  private isBoardSettling(): boolean {
    return this.cells.some((cell) => Math.abs(cell.objectY - this.getCellCenterY(cell)) > 1);
  }

  private getCellCenterY(cell: GridCell): number {
    return cell.y + cell.height / 2;
  }

  private drawRoundedRect(x: number, y: number, width: number, height: number, radius: number): void {
    const clampedRadius = Math.min(radius, width / 2, height / 2);

    this.context.beginPath();
    this.context.moveTo(x + clampedRadius, y);
    this.context.lineTo(x + width - clampedRadius, y);
    this.context.quadraticCurveTo(x + width, y, x + width, y + clampedRadius);
    this.context.lineTo(x + width, y + height - clampedRadius);
    this.context.quadraticCurveTo(x + width, y + height, x + width - clampedRadius, y + height);
    this.context.lineTo(x + clampedRadius, y + height);
    this.context.quadraticCurveTo(x, y + height, x, y + height - clampedRadius);
    this.context.lineTo(x, y + clampedRadius);
    this.context.quadraticCurveTo(x, y, x + clampedRadius, y);
    this.context.closePath();
  }
}
