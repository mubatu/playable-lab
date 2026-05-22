import { clientPointToStage, ViewportLayout } from '../game/sizing';

interface PointerInputOptions {
  canvas: HTMLCanvasElement;
  getLayout: () => ViewportLayout;
  onMove: (x: number) => void;
  onFirstInteraction: () => void;
}

export class PointerInput {
  private readonly canvas: HTMLCanvasElement;
  private readonly getLayout: () => ViewportLayout;
  private readonly onMove: (x: number) => void;
  private readonly onFirstInteraction: () => void;
  private hasInteracted = false;
  private isDown = false;

  constructor(options: PointerInputOptions) {
    this.canvas = options.canvas;
    this.getLayout = options.getLayout;
    this.onMove = options.onMove;
    this.onFirstInteraction = options.onFirstInteraction;

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
    this.canvas.addEventListener('pointermove', this.handlePointerMove);
    window.addEventListener('pointerup', this.handlePointerUp);
    window.addEventListener('pointercancel', this.handlePointerUp);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
    this.canvas.removeEventListener('pointermove', this.handlePointerMove);
    window.removeEventListener('pointerup', this.handlePointerUp);
    window.removeEventListener('pointercancel', this.handlePointerUp);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    this.isDown = true;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.emitInteraction();
    this.updatePosition(event);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDown) return;
    this.updatePosition(event);
  };

  private handlePointerUp = (): void => {
    this.isDown = false;
  };

  private updatePosition(event: PointerEvent): void {
    const point = clientPointToStage(this.canvas, this.getLayout(), event.clientX, event.clientY);
    this.onMove(point.x);
  }

  private emitInteraction(): void {
    if (this.hasInteracted) return;
    this.hasInteracted = true;
    this.onFirstInteraction();
  }
}
