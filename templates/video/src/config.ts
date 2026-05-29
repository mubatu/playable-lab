export const GAME_CONFIG = {
  ui: {
    endButton: {
      text: 'PLAY NOW!',
      width: 230,
      height: 60,
      fontSize: 32,
      centerYPercent: 73,
      backgroundColor: '#28ae03',
      textColor: '#ffffff',
      pulseScale: 1.08,
      pulseDurationMs: 900
    }
  }
} as const;

export type GameConfig = typeof GAME_CONFIG;
