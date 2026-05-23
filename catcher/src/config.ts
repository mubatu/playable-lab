export const GAME_CONFIG = {
  stage: {
    // Internal game-world width in pixels. The game logic and drawing use this coordinate system.
    width: 1080,
    // Internal game-world height in pixels.
    height: 1920, 
    // Width divided by height. For `1080 / 1920`, this is a 9:16 portrait layout.
    portraitRatio: 9 / 16,
    // Fallback canvas color shown behind the background image, useful when the viewport crops outside the stage.
    backgroundFill: '#0b2545'
  },
  gameplay: {
    // Total game duration before the game ends.
    durationSeconds: 30,
    // Score goal shown as `score/targetScore`. Reaching this score ends the game early.
    targetScore: 10,
    // Initial delay between falling item spawns.
    spawnIntervalMs: 360,
    // Fastest spawn delay after difficulty ramps up.
    minSpawnIntervalMs: 120,
    // How long it takes for spawn rate and speed difficulty to reach their maximum ramp.
    spawnRampDurationSeconds: 14,
    // Probability that a spawned item is a trap. `0.28` means 28%.
    trapChance: 0.28,
    // Maximum number of falling items allowed on screen at once.
    maxActiveItems: 1
  },
  basket: {
    // Basket render width in game-world pixels.
    width: 450,
    // Basket render height.
    height: 450,
    // Distance from the bottom of the stage to the bottom area positioning the basket.
    bottomOffset: 84,
    // Shrinks the basket collision box from left and right, so catches feel closer to the visible basket shape.
    collisionInsetX: 76,
    // Moves the basket collision area downward from the top.
    collisionInsetTop: 200,
    // Shrinks the collision area from the bottom.
    collisionInsetBottom: 36,
    // How quickly the basket follows pointer movement. Higher values feel snappier; lower values feel smoother.
    followLerp: 0.36,
    feedback: {
      // How long the catch feedback stays visible in milliseconds.
      durationMs: 620,
      // Text size for +1/-1 feedback in game-world pixels.
      textSize: 100,
      // How far the +1/-1 text floats upward during the effect.
      textRise: 54,
      // Target catch text color.
      targetTextColor: '#45f048',
      // Bomb catch text color.
      trapTextColor: '#ff1f1f',
      // Target catch basket glow color.
      targetGlowColor: '#ffffff',
      // Bomb catch basket glow color.
      trapGlowColor: '#ff1212',
      // Outer glow blur around the basket.
      glowBlur: 28,
      // Ripple circle size at the center of the basket.
      rippleRadius: 30,
      // Number of sparkles shown around the basket for a target catch.
      sparkleCount: 8
    }
  },
  fallingItem: {
    // Render size of targets and traps.
    size: 150,
    // Minimum falling speed.
    minSpeed: 1600,
    // Maximum falling speed.
    maxSpeed: 1800,
    // Extra speed added as difficulty ramps up.
    speedRamp: 220,
    // Starting Y position above the visible stage.
    spawnTopOffset: -120,
    // Keeps spawned items away from the left and right edges.
    horizontalPadding: 150,
    // Maximum random starting rotation in degrees. `0` means items spawn upright.
    spawnRotationAngle: 0,
    // Slowest counter-clockwise rotation speed.
    rotationSpeedMin: 0,
    // Fastest clockwise rotation speed.
    rotationSpeedMax: 0
  },
  audio: {
    // Background music volume multiplier.
    soundtrackVolume: 0.42,
    // Catch sound effect volume multiplier.
    effectVolume: 0.9
  },
  ui: {
    // When remaining time is at or below this value, the timer HUD switches to warning color.
    lowTimeWarningSeconds: 5,
    hud: {
      // Top offset from the safe-area top in CSS pixels.
      top: 80,
      // HUD width as a percentage of viewport width.
      widthVw: 84,
      // Maximum HUD width in CSS pixels.
      maxWidth: 300,
      // Gap between timer and progress bar in CSS pixels.
      gap: 6,
      // Timer text size in CSS pixels.
      timeFontSize: 36,
      // Timer text color.
      timeColor: '#ffffff',
      // Timer warning color when time is low.
      timeWarningColor: '#ffe17a',
      // Progress bar height in CSS pixels.
      progressHeight: 35,
      // Progress bar border width in CSS pixels.
      progressBorderWidth: 3,
      // Progress bar border color.
      progressBorderColor: 'rgba(23, 111, 135, 0.82)',
      // Progress bar background color.
      progressBackgroundColor: '#207e95',
      // Progress bar fill color.
      progressFillColor: '#57b8cf',
      // Progress label text size in CSS pixels.
      progressFontSize: 28,
      // Progress label text color.
      progressTextColor: '#ffffff'
    },
    endButton: {
      // Text shown on the end screen CTA button.
      text: 'EXPLORE',
      // Button width in CSS pixels.
      width: 200,
      // Button height in CSS pixels.
      height: 58,
      // Button text size in CSS pixels.
      fontSize: 26,
      // Button center Y position as a percentage of screen height.
      centerYPercent: 40,
      // Button background color.
      backgroundColor: '#f04f23',
      // Button text color.
      textColor: '#f7f7f7',
      // Largest scale used by the repeating big-small button effect.
      pulseScale: 1.08,
      // Duration of one big-small animation cycle in milliseconds.
      pulseDurationMs: 900
    }
  }
} as const;

export type GameConfig = typeof GAME_CONFIG;
