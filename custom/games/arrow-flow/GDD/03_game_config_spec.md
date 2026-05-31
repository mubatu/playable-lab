# game-config.js Specification

The prototype must expose core gameplay and layout variables in `game-config.js` so designers can tune the playable without editing core systems.

## Example `game-config.js`

```js
export const CONFIG = {
  resolution: {
    width: 1080,
    height: 1920,
    devicePixelRatioLimit: 2
  },

  camera: {
    type: 'orthographic',
    zoom: 1,
    boardYOffset: -120
  },

  grid: {
    rows: 5,
    cols: 4,
    cellSize: 120,
    cellGap: 8,
    cellHeight: 60
  },

  arrow: {
    exitIntervalSeconds: 0.08,
    exitAnimationSeconds: 0.12,
    clickablePulseDelaySeconds: 1.5,
    invalidTapFeedbackSeconds: 0.12
  },

  frame: {
    slotCount: 36,
    moveTickSeconds: 0.18,
    entrySlotIndex: 0,
    allowChainedMovementPerTick: false,
    loseOnlyWhenFullAndNoShot: true
  },

  shooter: {
    fireCooldownSeconds: 0.0,
    simultaneousFire: true,
    consumeShotOnSuccessfulDestroyOnly: true,
    inactiveWhenShotsReachZero: true,
    shotAnimationSeconds: 0.08
  },

  input: {
    enableMouse: true,
    enableTouch: true,
    raycastAgainstArrowGroups: true
  },

  playableAd: {
    maxSessionSeconds: 30,
    showCTAOnWin: true,
    showCTAOnLose: true,
    showCTAOnTimeout: true,
    autoHintAfterSeconds: 1.5
  },

  colors: {
    pink: 0xff3fa6,
    yellow: 0xffe234,
    green: 0x30e83a,
    orange: 0xff9a19,
    purple: 0x8b55ff,
    frame: 0xb8c8ef,
    background: 0x555b7a,
    gridBase: 0x6d7294
  },

  debug: {
    showFrameSlotIndices: false,
    showShooterSightLines: false,
    logStateChanges: false,
    startPaused: false
  }
};
```

## Required Config Categories

### Resolution

Controls base playable dimensions.

Required values:

- width: 1080
- height: 1920

### Grid

Controls grid dimensions and cell size.

Required values:

- rows
- cols
- cellSize
- cellGap

`cellSize` is the canonical size for both grid arrow cells and frame path cells. Do not introduce a separate smaller frame-cell size unless the design document is explicitly updated to allow it.

### Arrow

Controls arrow release speed and feedback.

Required values:

- exitIntervalSeconds
- exitAnimationSeconds

`exitAnimationSeconds` should describe the time for one cell-to-cell step while an arrow exits the grid. `exitIntervalSeconds` should usually match or slightly exceed this value so body cells follow without visual overlap or artificial gaps.

### Frame

Controls frame capacity and movement.

Required values:

- slotCount
- moveTickSeconds
- entrySlotIndex

`entrySlotIndex` is only a fallback/debug default. Normal arrow exits should derive their entry slot from the arrow direction and the exiting cell's row or column. Implementations must not route every arrow cell through one global starter slot.

Frame movement must preserve compact adjacency. Do not tune movement by adding empty slots between cells; use shooter destruction or blocked insertion to create gaps.

### Shooter

Controls firing behavior.

Required values:

- simultaneousFire
- fireCooldownSeconds
- inactiveWhenShotsReachZero

Shooter targeting should be direct-slot based. Config may include debug sight-line visuals, but gameplay targeting must use the single frame slot directly in front of each shooter rather than all slots on that side.

### Playable Ad

Controls short-session behavior.

Required values:

- maxSessionSeconds
- showCTAOnWin
- showCTAOnLose
- showCTAOnTimeout

## Tuning Notes

To make the game easier:

- increase frame slot count
- decrease frame move speed
- increase shooter shot counts
- reduce arrow lengths
- create more immediately clickable arrows

To make the game harder:

- decrease frame slot count
- increase frame move speed
- reduce shooter shot counts
- add longer arrows
- place shooters behind blockers
- use colors that appear before their shooters become useful
