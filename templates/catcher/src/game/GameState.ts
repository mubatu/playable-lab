import { GAME_CONFIG } from '../config';

export type GameStatus = 'loading' | 'ready' | 'playing' | 'paused' | 'ended';

export interface GameState {
  status: GameStatus;
  score: number;
  remainingSeconds: number;
  elapsedSeconds: number;
  targetScore: number;
}

export function createInitialGameState(): GameState {
  return {
    status: 'loading',
    score: 0,
    remainingSeconds: GAME_CONFIG.gameplay.durationSeconds,
    elapsedSeconds: 0,
    targetScore: GAME_CONFIG.gameplay.targetScore
  };
}
