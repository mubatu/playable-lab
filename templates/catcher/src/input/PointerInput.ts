import { clientPointToStage, ViewportLayout } from '../game/sizing';

interface StagePoint {
  x: number;
  y: number;
}

interface PointerInputOptions {
  canvas: HTMLCanvasElement;
  getLayout: () => ViewportLayout;
  onMove: (x: number) => void;
  shouldStartDrag: (point: StagePoint) => boolean;
}

export class PointerInput {
  private readonly canvas: HTMLCanvasElement;
  private readonly getLayout: () => ViewportLayout;
  private readonly onMove: (x: number) => void;
  private readonly shouldStartDrag: (point: StagePoint) => boolean;
  private isDown = false;

  constructor(options: PointerInputOptions) {
    this.canvas = options.canvas;
    this.getLayout = options.getLayout;
    this.onMove = options.onMove;
    this.shouldStartDrag = options.shouldStartDrag;

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
    const point = this.getStagePoint(event);

    if (!this.shouldStartDrag(point)) return;

    this.isDown = true;
    this.canvas.setPointerCapture?.(event.pointerId);
    this.onMove(point.x);
  };

  private handlePointerMove = (event: PointerEvent): void => {
    if (!this.isDown) return;
    this.updatePosition(event);
  };

  private handlePointerUp = (): void => {
    this.isDown = false;
  };

  private updatePosition(event: PointerEvent): void {
    const point = this.getStagePoint(event);
    this.onMove(point.x);
  }

  private getStagePoint(event: PointerEvent): StagePoint {
    return clientPointToStage(this.canvas, this.getLayout(), event.clientX, event.clientY);
  }
}
