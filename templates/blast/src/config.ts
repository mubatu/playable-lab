export const GAME_CONFIG = {
  stage: {
    width: 1080,
    height: 1920,
    portraitRatio: 9 / 16,
    backgroundFill: '#101521'
  },
  gameplay: {
    durationSeconds: 120,
    targetObjectIndex: 0,
    targetCount: 20,
    minBlastGroupSize: 2
  },
  grid: {
    rows: 5,
    columns: 5,
    x: 105,
    y: 600,
    width: 750,
    height: 750,
    gapX: 18,
    gapY: 18,
    cellRadius: 28,
    cellFillColor: 'rgba(255, 255, 255, 0.18)',
    cellStrokeColor: 'rgba(255, 255, 255, 0.42)',
    cellStrokeWidth: 4,
    cellShadowColor: 'rgba(0, 0, 0, 0.22)',
    objectSize: 150,
    fallSpeed: 720,
    targetSpawnChance: 0.2,
    minTargetCells: 3
  },
  blast: {
    durationMs: 820,
    ringStartRadius: 36,
    ringEndRadius: 118,
    ringWidth: 7,
    ringColor: 'rgba(255, 255, 255, 0.86)',
    particleCount: 18,
    particleDistance: 134,
    particleSize: 8,
    particleColors: ['#ffffff', '#ffe66d', '#ff8a4a', '#7df8ff']
  },
  audio: {
    soundtrackVolume: 0.42,
    effectVolume: 0.9
  },
  ui: {
    lowTimeWarningSeconds: 5,
    instructionText: 'BLAST THE GERMS!',
    hud: {
      top: 60,
      widthVw: 88,
      maxWidth: 430,
      height: 70,
      gap: 12,
      fontSize: 30,
      textColor: '#ffffff',
      warningColor: '#ffe16a',
      panelColor: 'rgba(18, 26, 44, 0.72)',
      panelBorderColor: 'rgba(255, 255, 255, 0.36)',
      targetIconSize: 48
    },
    instruction: {
      top: 160,
      fontSize: 30,
      color: '#ffffff',
      strokeColor: 'rgba(0, 0, 0, 0.4)'
    },
    endButton: {
      text: 'PLAY NOW!',
      width: 210,
      height: 60,
      fontSize: 26,
      centerYPercent: 80,
      backgroundColor: '#003678',
      textColor: '#ffffff',
      pulseScale: 1.08,
      pulseDurationMs: 900
    }
  }
} as const;

export type GameConfig = typeof GAME_CONFIG;
