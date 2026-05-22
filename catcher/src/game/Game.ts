import { LoadedImages } from '../assets';
import { GAME_CONFIG } from '../config';
import { getBasketCollisionRect, getItemCollisionRect, intersects } from './collision';
import { BasketState, FallingItem } from './entities';
import { createInitialGameState, GameState } from './GameState';
import { calculateViewportLayout, ViewportLayout } from './sizing';
import { createFallingItem, getSpawnInterval } from './spawning';

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
    this.items.push(createFallingItem(this.state.elapsedSeconds));
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
      this.callbacks.onCatchTarget();
      return;
    }

    this.state.score -= 1;
    this.callbacks.onCatchTrap();
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
      this.renderBasket();
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
