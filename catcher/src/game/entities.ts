export type FallingItemKind = 'target' | 'trap';

export interface FallingItem {
  id: number;
  kind: FallingItemKind;
  x: number;
  y: number;
  size: number;
  speed: number;
  rotation: number;
  rotationSpeed: number;
  targetIndex: number;
}

export interface BasketState {
  x: number;
  y: number;
  width: number;
  height: number;
  targetX: number;
}

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}
