import { LoadedImages } from '../assets';
import { GAME_CONFIG } from '../config';
import { getBasketCollisionRect, getItemCollisionRect, intersects } from './collision';
import { BasketState, FallingItem } from './entities';
import { createInitialGameState, GameState } from './GameState';
import { calculateViewportLayout, ViewportLayout } from './sizing';
import { createFallingItem, getSpawnInterval } from './spawning';

type CatchFeedbackKind = 'target' | 'trap';

interface CatchFeedback {
  kind: CatchFeedbackKind;
  elapsedSeconds: number;
  durationSeconds: number;
  basketX: number;
  basketY: number;
  particles: CatchFeedbackParticle[];
}

interface CatchFeedbackParticle {
  angle: number;
  distance: number;
  size: number;
}

interface GameCallbacks {
  onHudChange: (state: GameState) => void;
  onCatchTarget: () => void;
  onCatchTrap: () => void;
  onEnd: (state: GameState) => void;
}

export class Game {
  private readonly canvas: HTMLCanvasElement;
  private readonly context: CanvasRenderingContext2D;
  private readonly images: LoadedImages;
  private readonly callbacks: GameCallbacks;
  private readonly basket: BasketState;
  private readonly items: FallingItem[] = [];
  private state = createInitialGameState();
  private layout: ViewportLayout;
  private animationFrame = 0;
  private lastTime = 0;
  private spawnAccumulator = 0;
  private catchFeedback: CatchFeedback | null = null;

  constructor(canvas: HTMLCanvasElement, images: LoadedImages, callbacks: GameCallbacks) {
    const context = canvas.getContext('2d');

    if (!context) {
      throw new Error('Canvas 2D context is not available');
    }

    this.canvas = canvas;
    this.context = context;
    this.images = images;
    this.callbacks = callbacks;
    this.layout = calculateViewportLayout(canvas, window.innerWidth, window.innerHeight);
    this.basket = this.createBasket();
  }

  getLayout(): ViewportLayout {
    return this.layout;
  }

  markReady(): void {
    this.state.status = 'ready';
    this.callbacks.onHudChange(this.state);
    this.render();
  }

  start(): void {
    if (this.state.status === 'playing') return;
    this.state = createInitialGameState();
    this.state.status = 'playing';
    this.items.length = 0;
    this.spawnAccumulator = GAME_CONFIG.gameplay.spawnIntervalMs * 0.6;
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
    this.items.length = 0;
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

    this.clampBasket();
    this.render();
  }

  setBasketTarget(x: number): void {
    const halfWidth = this.basket.width / 2;
    this.basket.targetX = Math.max(halfWidth, Math.min(GAME_CONFIG.stage.width - halfWidth, x));
  }

  private loop = (time: number): void => {
    if (this.state.status !== 'playing') return;

    const deltaSeconds = Math.min(0.033, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.update(deltaSeconds);
    this.render();
    this.animationFrame = requestAnimationFrame(this.loop);
  };

  private update(deltaSeconds: number): void {
    this.state.elapsedSeconds += deltaSeconds;
    this.state.remainingSeconds = Math.max(0, GAME_CONFIG.gameplay.durationSeconds - this.state.elapsedSeconds);

    this.updateBasket();
    this.updateSpawning(deltaSeconds);
    this.updateItems(deltaSeconds);
    this.updateCatchFeedback(deltaSeconds);
    this.callbacks.onHudChange(this.state);

    if (this.state.remainingSeconds <= 0 || this.state.score >= this.state.targetScore) {
      this.finish();
    }
  }

  private updateBasket(): void {
    const { followLerp } = GAME_CONFIG.basket;
    this.basket.x += (this.basket.targetX - this.basket.x) * followLerp;
    this.clampBasket();
  }

  private updateSpawning(deltaSeconds: number): void {
    if (this.items.length >= GAME_CONFIG.gameplay.maxActiveItems) return;

    this.spawnAccumulator += deltaSeconds * 1000;
    const interval = getSpawnInterval(this.state.elapsedSeconds);

    if (this.spawnAccumulator < interval) return;

    this.spawnAccumulator = 0;
    this.items.push(createFallingItem(this.state.elapsedSeconds, this.images.targets.length));
  }

  private updateItems(deltaSeconds: number): void {
    const basketRect = getBasketCollisionRect(this.basket);

    for (let index = this.items.length - 1; index >= 0; index -= 1) {
      const item = this.items[index];
      item.y += item.speed * deltaSeconds;
      item.rotation += item.rotationSpeed * deltaSeconds;

      if (intersects(basketRect, getItemCollisionRect(item))) {
        this.catchItem(item);
        this.items.splice(index, 1);
        continue;
      }

      if (item.y - item.size / 2 > GAME_CONFIG.stage.height) {
        this.items.splice(index, 1);
      }
    }
  }

  private catchItem(item: FallingItem): void {
    if (item.kind === 'target') {
      this.state.score += 1;
      this.showCatchFeedback('target');
      this.callbacks.onCatchTarget();
      return;
    }

    this.state.score = Math.max(0, this.state.score - 1);
    this.showCatchFeedback('trap');
    this.callbacks.onCatchTrap();
  }

  private showCatchFeedback(kind: CatchFeedbackKind): void {
    const durationSeconds = GAME_CONFIG.basket.feedback.durationMs / 1000;

    this.catchFeedback = {
      kind,
      elapsedSeconds: 0,
      durationSeconds,
      basketX: this.basket.x,
      basketY: this.basket.y,
      particles: this.createFeedbackParticles()
    };
  }

  private createFeedbackParticles(): CatchFeedbackParticle[] {
    const particles: CatchFeedbackParticle[] = [];
    const { sparkleCount } = GAME_CONFIG.basket.feedback;

    for (let index = 0; index < sparkleCount; index += 1) {
      particles.push({
        angle: (Math.PI * 2 * index) / sparkleCount + Math.random() * 0.35,
        distance: 150 + Math.random() * 118,
        size: 16 + Math.random() * 20
      });
    }

    return particles;
  }

  private updateCatchFeedback(deltaSeconds: number): void {
    if (!this.catchFeedback) return;

    this.catchFeedback.elapsedSeconds += deltaSeconds;

    if (this.catchFeedback.elapsedSeconds >= this.catchFeedback.durationSeconds) {
      this.catchFeedback = null;
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
      this.renderItems();
      this.renderBasketGlow();
      this.renderBasket();
      this.renderCatchFeedback();
    }
  }

  private renderItems(): void {
    for (const item of this.items) {
      const image = item.kind === 'trap' ? this.images.bomb : this.images.targets[item.targetIndex % this.images.targets.length];

      this.context.save();
      this.context.translate(item.x, item.y);
      this.context.rotate(item.rotation);
      this.context.drawImage(image, -item.size / 2, -item.size / 2, item.size, item.size);
      this.context.restore();
    }
  }

  private renderBasket(): void {
    this.context.drawImage(
      this.images.basket,
      this.basket.x - this.basket.width / 2,
      this.basket.y - this.basket.height / 2,
      this.basket.width,
      this.basket.height
    );
  }

  private renderBasketGlow(): void {
    if (!this.catchFeedback) return;

    const progress = this.getFeedbackProgress(this.catchFeedback);
    const alpha = 1 - progress;
    const glowColor = this.getFeedbackGlowColor(this.catchFeedback.kind);

    this.context.save();
    this.context.globalAlpha = alpha;
    this.context.shadowColor = glowColor;
    this.context.shadowBlur = GAME_CONFIG.basket.feedback.glowBlur * (1 + (1 - progress) * 0.6);
    this.context.drawImage(
      this.images.basket,
      this.basket.x - this.basket.width / 2,
      this.basket.y - this.basket.height / 2,
      this.basket.width,
      this.basket.height
    );
    this.context.restore();
  }

  private renderCatchFeedback(): void {
    if (!this.catchFeedback) return;

    const feedback = this.catchFeedback;
    const progress = this.getFeedbackProgress(feedback);
    const alpha = 1 - progress;

    this.renderCatchRipple(feedback, progress, alpha);

    if (feedback.kind === 'target') {
      this.renderSparkles(feedback, progress, alpha);
    }

    this.renderCatchText(feedback, progress, alpha);
  }

  private renderCatchRipple(feedback: CatchFeedback, progress: number, alpha: number): void {
    const radius = GAME_CONFIG.basket.feedback.rippleRadius * (0.65 + progress);

    this.context.save();
    this.context.globalAlpha = alpha;
    this.context.strokeStyle = this.getFeedbackGlowColor(feedback.kind);
    this.context.lineWidth = 8;
    this.context.shadowColor = this.getFeedbackGlowColor(feedback.kind);
    this.context.shadowBlur = 10;
    this.context.beginPath();
    this.context.arc(feedback.basketX, feedback.basketY - this.basket.height * 0.12, radius, 0, Math.PI * 2);
    this.context.stroke();
    this.context.restore();
  }

  private renderCatchText(feedback: CatchFeedback, progress: number, alpha: number): void {
    const text = feedback.kind === 'target' ? '+1' : '-1';
    const color = feedback.kind === 'target' ? GAME_CONFIG.basket.feedback.targetTextColor : GAME_CONFIG.basket.feedback.trapTextColor;
    const y = feedback.basketY - this.basket.height * 0.46 - GAME_CONFIG.basket.feedback.textRise * progress;

    this.context.save();
    this.context.globalAlpha = Math.min(1, alpha * 1.35);
    this.context.fillStyle = color;
    this.context.strokeStyle = feedback.kind === 'target' ? '#4b9d38' : '#9a0000';
    this.context.lineWidth = 12;
    this.context.font = `900 ${GAME_CONFIG.basket.feedback.textSize}px Arial, sans-serif`;
    this.context.textAlign = 'center';
    this.context.textBaseline = 'middle';
    this.context.shadowColor = 'rgba(255, 255, 255, 0.78)';
    this.context.shadowBlur = feedback.kind === 'target' ? 12 : 0;
    this.context.strokeText(text, feedback.basketX, y);
    this.context.fillText(text, feedback.basketX, y);
    this.context.restore();
  }

  private renderSparkles(feedback: CatchFeedback, progress: number, alpha: number): void {
    this.context.save();
    this.context.globalAlpha = alpha;
    this.context.fillStyle = '#ffffff';
    this.context.shadowColor = '#ffffff';
    this.context.shadowBlur = 12;

    for (const particle of feedback.particles) {
      const distance = particle.distance * (0.45 + progress * 0.7);
      const x = feedback.basketX + Math.cos(particle.angle) * distance;
      const y = feedback.basketY - this.basket.height * 0.08 + Math.sin(particle.angle) * distance;

      this.drawSparkle(x, y, particle.size * (1 - progress * 0.25));
    }

    this.context.restore();
  }

  private drawSparkle(x: number, y: number, size: number): void {
    this.context.beginPath();
    this.context.moveTo(x, y - size);
    this.context.lineTo(x + size * 0.24, y - size * 0.24);
    this.context.lineTo(x + size, y);
    this.context.lineTo(x + size * 0.24, y + size * 0.24);
    this.context.lineTo(x, y + size);
    this.context.lineTo(x - size * 0.24, y + size * 0.24);
    this.context.lineTo(x - size, y);
    this.context.lineTo(x - size * 0.24, y - size * 0.24);
    this.context.closePath();
    this.context.fill();
  }

  private getFeedbackProgress(feedback: CatchFeedback): number {
    return Math.min(1, feedback.elapsedSeconds / feedback.durationSeconds);
  }

  private getFeedbackGlowColor(kind: CatchFeedbackKind): string {
    return kind === 'target' ? GAME_CONFIG.basket.feedback.targetGlowColor : GAME_CONFIG.basket.feedback.trapGlowColor;
  }

  private createBasket(): BasketState {
    const x = GAME_CONFIG.stage.width / 2;
    const y = GAME_CONFIG.stage.height - GAME_CONFIG.basket.bottomOffset - GAME_CONFIG.basket.height / 2;

    return {
      x,
      y,
      targetX: x,
      width: GAME_CONFIG.basket.width,
      height: GAME_CONFIG.basket.height
    };
  }

  private clampBasket(): void {
    const halfWidth = this.basket.width / 2;
    this.basket.x = Math.max(halfWidth, Math.min(GAME_CONFIG.stage.width - halfWidth, this.basket.x));
    this.basket.targetX = Math.max(halfWidth, Math.min(GAME_CONFIG.stage.width - halfWidth, this.basket.targetX));
  }
}
