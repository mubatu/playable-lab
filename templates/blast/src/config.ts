export const GAME_CONFIG = {
  stage: {
    // Internal game-world width in pixels. The game logic and drawing use this coordinate system.
    width: 1080,
    // Internal game-world height in pixels.
    height: 1920,
    // Fallback canvas color shown behind the background image, useful when the viewport crops outside the stage.
    backgroundFill: '#101521'
  },
  gameplay: {
    // Total game duration before the game ends.
    durationSeconds: 120,
    // Zero-based index of the object shown in the HUD as the target. `0` uses `object-1.png`; values are clamped to available objects.
    targetObjectIndex: 0,
    // Number of target objects the player needs to blast before the game ends.
    targetCount: 20,
    // Minimum connected same-object group size required for a tap to blast the group.
    minBlastGroupSize: 2
  },
  grid: {
    // Number of object rows in the board.
    rows: 7,
    // Number of object columns in the board.
    columns: 6,
    // Distance from the top of the stage to the top edge of the centered grid panel.
    top: 600,
    // Inner spacing between the panel edge and the first/last object centers.
    padding: 10,
    // Horizontal spacing between neighboring object cells.
    gapX: 10,
    // Vertical spacing between neighboring object cells.
    gapY: 10,
    // Corner radius of the single rounded grid panel.
    panelRadius: 34,
    // Fill color of the grid panel behind all objects.
    panelFillColor: '#f8f1ff',
    // Stroke color around the grid panel.
    panelStrokeColor: '#ffffff',
    // Stroke width around the grid panel.
    panelStrokeWidth: 5,
    // Drop shadow color for the grid panel.
    panelShadowColor: '#000000',
    // Render size of each object in game-world pixels.
    objectSize: 120,
    // Falling speed for objects after a blast, in game-world pixels per second.
    fallSpeed: 800,
    // Probability that newly generated objects use the target object.
    targetSpawnChance: 0.2,
    // Minimum number of target objects kept on the board after generation or refill.
    minTargetCells: 3
  },
  blast: {
    // How long blast particles and ring stay visible in milliseconds.
    durationMs: 820,
    // Starting radius of the blast ring.
    ringStartRadius: 36,
    // Final radius of the blast ring.
    ringEndRadius: 118,
    // Initial stroke width of the blast ring.
    ringWidth: 7,
    // Color of the blast ring.
    ringColor: '#ffffff',
    // Number of small circle particles emitted per blasted object.
    particleCount: 18,
    // Maximum distance particles travel from the blasted object.
    particleDistance: 134,
    // Base radius of each particle.
    particleSize: 8,
    // Particle colors are cycled across the emitted circles.
    particleColors: ['#ffffff', '#ffe66d', '#ff8a4a', '#7df8ff']
  },
  tutorialHand: {
    // Whether the hand tutorial appears over a valid matching group.
    enabled: true,
    // How long after the latest object tap the hand waits before appearing again.
    idleDelayMs: 1800,
    // Hand render width in game-world pixels.
    width: 180,
    // Hand render height in game-world pixels.
    height: 180,
    // Horizontal offset from the hinted object center in game-world pixels.
    offsetX: 55,
    // Vertical offset from the hinted object center in game-world pixels.
    offsetY: 70,
    // Largest scale used by the repeating tap pulse effect.
    pulseScale: 1.12,
    // Duration of one tutorial pulse cycle in milliseconds.
    cycleDurationMs: 1400,
    // Duration of the fade in when the hand appears and fade out after a tap.
    fadeDurationMs: 260,
    // Hand opacity.
    opacity: 1
  },
  audio: {
    // Background music volume multiplier.
    soundtrackVolume: 0.42,
    // Blast sound effect volume multiplier.
    effectVolume: 0.9
  },
  ui: {
    // When remaining time is at or below this value, the timer HUD switches to warning color.
    lowTimeWarningSeconds: 10,
    // Text shown between the top HUD and the grid.
    instructionText: 'BLAST THE GERMS!',
    hud: {
      // Top offset from the safe-area top in CSS pixels.
      top: 60,
      // HUD width as a percentage of viewport width.
      widthVw: 88,
      // Maximum HUD width in CSS pixels.
      maxWidth: 430,
      // HUD panel height in CSS pixels.
      height: 70,
      // Gap between timer and target panels in CSS pixels.
      gap: 12,
      // HUD text size in CSS pixels.
      fontSize: 30,
      // Normal HUD text color.
      textColor: '#ffffff',
      // Timer warning color when time is low.
      warningColor: '#ffe16a',
      // Background color for timer and target panels.
      panelColor: '#121a2c',
      // Border color for timer and target panels.
      panelBorderColor: '#ffffff',
      // Target icon size inside the HUD.
      targetIconSize: 48
    },
    instruction: {
      // Top offset for the instruction text in CSS pixels.
      top: 170,
      // Instruction text size in CSS pixels.
      fontSize: 30,
      // Instruction text color.
      color: '#ffffff',
      // Shadow/stroke color used behind the instruction text.
      strokeColor: '#000000'
    },
    endButton: {
      // Text shown on the end screen CTA button.
      text: 'PLAY NOW!',
      // Button width in CSS pixels.
      width: 210,
      // Button height in CSS pixels.
      height: 60,
      // Button text size in CSS pixels.
      fontSize: 26,
      // Button center Y position as a percentage of screen height.
      centerYPercent: 85,
      // Button background color.
      backgroundColor: '#003678',
      // Button text color.
      textColor: '#ffffff',
      // Largest scale used by the repeating big-small button effect.
      pulseScale: 1.08,
      // Duration of one big-small animation cycle in milliseconds.
      pulseDurationMs: 900
    }
  }
} as const;

export type GameConfig = typeof GAME_CONFIG;
