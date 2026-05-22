export const GAME_CONFIG = {
  stage: {
    width: 1080,
    height: 1920,
    portraitRatio: 1080 / 1920,
    backgroundFill: '#0b2545'
  },
  gameplay: {
    durationSeconds: 20,
    targetScore: 12,
    spawnIntervalMs: 720,
    minSpawnIntervalMs: 360,
    spawnRampDurationSeconds: 14,
    trapChance: 0.28,
    maxActiveItems: 12
  },
  basket: {
    width: 330,
    height: 330,
    bottomOffset: 84,
    collisionInsetX: 76,
    collisionInsetTop: 124,
    collisionInsetBottom: 36,
    followLerp: 0.36
  },
  fallingItem: {
    size: 132,
    minSpeed: 470,
    maxSpeed: 710,
    speedRamp: 220,
    spawnTopOffset: -120,
    horizontalPadding: 92,
    rotationSpeedMin: -2.2,
    rotationSpeedMax: 2.2
  },
  audio: {
    soundtrackVolume: 0.42,
    effectVolume: 0.9
  },
  ui: {
    lowTimeWarningSeconds: 5
  }
} as const;

export type GameConfig = typeof GAME_CONFIG;
