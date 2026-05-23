import { clientPointToStage, ViewportLayout } from '../game/sizing';

interface StagePoint {
  x: number;
  y: number;
}

interface PointerInputOptions {
  canvas: HTMLCanvasElement;
  getLayout: () => ViewportLayout;
  onTap: (point: StagePoint) => void;
}

export class PointerInput {
  private readonly canvas: HTMLCanvasElement;
  private readonly getLayout: () => ViewportLayout;
  private readonly onTap: (point: StagePoint) => void;

  constructor(options: PointerInputOptions) {
    this.canvas = options.canvas;
    this.getLayout = options.getLayout;
    this.onTap = options.onTap;

    this.canvas.addEventListener('pointerdown', this.handlePointerDown);
  }

  destroy(): void {
    this.canvas.removeEventListener('pointerdown', this.handlePointerDown);
  }

  private handlePointerDown = (event: PointerEvent): void => {
    event.preventDefault();
    this.canvas.setPointerCapture?.(event.pointerId);
    this.onTap(this.getStagePoint(event));
  };

  private getStagePoint(event: PointerEvent): StagePoint {
    return clientPointToStage(this.canvas, this.getLayout(), event.clientX, event.clientY);
  }
}
