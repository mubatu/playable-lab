import { GAME_CONFIG } from '../config';

export interface ViewportLayout {
  cssWidth: number;
  cssHeight: number;
  pixelWidth: number;
  pixelHeight: number;
  dpr: number;
  scale: number;
  offsetX: number;
  offsetY: number;
}

export function calculateViewportLayout(canvas: HTMLCanvasElement, fallbackWidth: number, fallbackHeight: number): ViewportLayout {
  const rect = canvas.getBoundingClientRect();
  const cssWidth = Math.max(1, rect.width || fallbackWidth || window.innerWidth);
  const cssHeight = Math.max(1, rect.height || fallbackHeight || window.innerHeight);
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const pixelWidth = Math.round(cssWidth * dpr);
  const pixelHeight = Math.round(cssHeight * dpr);
  const scale = Math.max(pixelWidth / GAME_CONFIG.stage.width, pixelHeight / GAME_CONFIG.stage.height);

  return {
    cssWidth,
    cssHeight,
    pixelWidth,
    pixelHeight,
    dpr,
    scale,
    offsetX: (pixelWidth - GAME_CONFIG.stage.width * scale) / 2,
    offsetY: (pixelHeight - GAME_CONFIG.stage.height * scale) / 2
  };
}

export function clientPointToStage(canvas: HTMLCanvasElement, layout: ViewportLayout, clientX: number, clientY: number): {
  x: number;
  y: number;
} {
  const rect = canvas.getBoundingClientRect();
  const pixelX = (clientX - rect.left) * layout.dpr;
  const pixelY = (clientY - rect.top) * layout.dpr;

  return {
    x: (pixelX - layout.offsetX) / layout.scale,
    y: (pixelY - layout.offsetY) / layout.scale
  };
}
