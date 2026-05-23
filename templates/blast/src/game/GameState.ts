import { GAME_CONFIG } from '../config';

export type GameStatus = 'ready' | 'playing' | 'paused' | 'ended';

export interface GameState {
  status: GameStatus;
  elapsedSeconds: number;
  remainingSeconds: number;
  targetObjectIndex: number;
  targetRemaining: number;
  targetCount: number;
}

export function createInitialGameState(): GameState {
  return {
    status: 'ready',
    elapsedSeconds: 0,
    remainingSeconds: GAME_CONFIG.gameplay.durationSeconds,
    targetObjectIndex: GAME_CONFIG.gameplay.targetObjectIndex,
    targetRemaining: GAME_CONFIG.gameplay.targetCount,
    targetCount: GAME_CONFIG.gameplay.targetCount
  };
}
