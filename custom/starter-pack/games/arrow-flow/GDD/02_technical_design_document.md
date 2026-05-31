# Arrow Flow-Style Prototype — Technical Design Document

## 1. Technical Overview

The prototype will be implemented using Three.js as a portrait playable ad with a target resolution of 1080 x 1920.

The game should be data-driven. Core variables must be exposed in `game-config.js` so the playable can be tuned without changing core game logic.

## 3. Coordinate Systems

### Grid Coordinates

Use integer grid coordinates:

```js
{ row: 0, col: 0 }
```

Rows increase downward. Columns increase rightward.

### World Coordinates

Convert grid coordinates to Three.js positions using configurable cell size and spacing.

Recommended:

```js
x = (col - (gridCols - 1) / 2) * cellSpacing;
z = (row - (gridRows - 1) / 2) * cellSpacing;
y = 0;
```

For portrait view, use an orthographic camera looking toward the board.

## 4. Main Game State

Recommended state enum:

```js
const GameState = {
  READY: 'ready',
  PLAYING: 'playing',
  WIN: 'win',
  LOSE: 'lose'
};
```

## 5. Main Update Loop

Recommended order per frame:

1. update timers
2. process scheduled arrow exits
3. move frame cells if movement tick elapsed
4. resolve shooter firing
5. update visuals
6. check win condition
7. check lose condition

Pseudo-code:

```js
function update(dt) {
  if (state !== GameState.PLAYING) return;

  arrowExitSystem.update(dt);

  tickAccumulator += dt;
  while (tickAccumulator >= CONFIG.frame.moveTickSeconds) {
    tickAccumulator -= CONFIG.frame.moveTickSeconds;
    framePath.step();
    shooterSystem.resolveAllShots();
    winLoseSystem.evaluate();
  }

  animationSystem.update(dt);
}
```

## 6. Arrow Data Model

```js
class Arrow {
  constructor({ id, color, direction, cells, head }) {
    this.id = id;
    this.color = color;
    this.direction = direction;
    this.cells = cells;
    this.head = head;
    this.isExiting = false;
    this.isFullyExited = false;
  }
}
```

## 7. Clickability Algorithm

An arrow is clickable if no occupied grid cell exists in front of the head along the arrow direction until the grid boundary.

Pseudo-code:

```js
function isArrowClickable(arrow, grid) {
  let current = nextCell(arrow.head, arrow.direction);

  while (grid.isInside(current)) {
    if (grid.hasCell(current)) {
      return false;
    }
    current = nextCell(current, arrow.direction);
  }

  return true;
}
```

Only cells in front of the head matter.

## 8. Arrow Exit System

When clicked, the full arrow is scheduled to exit cell by cell.

Requirements:

- head exits first
- body cells follow in order
- one click schedules all cells
- each exiting cell is removed from grid occupancy
- each exiting cell moves through grid-space waypoints in the arrow direction until it reaches the aligned frame slot
- each exiting cell is inserted into that aligned frame slot if capacity allows
- the same visual cell object should be reused from grid movement into frame movement when possible

Recommended behavior if frame entry is blocked/full:

- keep the exiting cell waiting at its aligned frame slot until that slot opens
- do not lose immediately unless lose condition is met
- do not teleport cells to a single global frame entry slot

Pseudo-code:

```js
function startArrowExit(arrow) {
  if (arrow.isExiting) return;
  if (!isArrowClickable(arrow, grid)) return;

  arrow.isExiting = true;
  arrow.exitQueue = orderCellsHeadFirst(arrow);
}

function updateArrowExit(dt) {
  exitTimer += dt;
  if (exitTimer < CONFIG.arrow.exitIntervalSeconds) return;
  exitTimer = 0;

  for (const arrow of exitingArrows) {
    const nextCell = arrow.exitQueue[0];
    if (!nextCell) {
      arrow.isFullyExited = true;
      continue;
    }

    arrow.exitQueue.shift();
    grid.removeCell(nextCell);
    movingCells.push({
      color: arrow.color,
      mesh: nextCell.mesh,
      waypoints: buildGridExitWaypoints(nextCell, arrow.direction),
      targetSlotIndex: framePath.getAlignedEntrySlot(nextCell, arrow.direction)
    });
  }
}
```

`buildGridExitWaypoints` should generate one waypoint per empty grid cell in front of the exiting cell, then one final waypoint at the aligned frame slot. The cell should follow this same discrete path language used by the frame; avoid free-form shortcuts or direct teleports.

When a moving cell reaches its aligned frame slot:

```js
if (framePath.canInsertAtSlot(movingCell.targetSlotIndex)) {
  framePath.insertExistingCellAtSlot(movingCell.mesh, movingCell.targetSlotIndex);
} else {
  movingCell.waitAtFrameSlot();
}
```

## 9. Frame Path System

Represent the frame as an ordered array of slots.

```js
class FramePath {
  constructor(slotCount) {
    this.slots = Array(slotCount).fill(null);
    this.entryIndex = 0;
  }
}
```

### Movement Rule

Cells advance one slot per frame tick while preserving their order and adjacency.

Because cells cannot overtake, deterministic movement is required. Adjacent cells should move together as a compact train; do not leave a one-slot gap between cells simply because the destination slot was occupied at the start of the tick.

Simpler prototype approach:

- use a circular path
- on each tick, shift every occupied slot to `(index + 1) % slotCount`
- preserve relative order
- allow a cell to move into the slot vacated by the cell ahead during the same tick
- only create gaps when a cell was destroyed or when a cell is waiting to enter from the grid

## 10. Shooter System

Each shooter has a single direct target slot: the frame slot physically aligned with its barrel.

```js
class Shooter {
  constructor({ id, color, shots, directSlotIndex, isBlocked }) {
    this.id = id;
    this.color = color;
    this.shots = shots;
    this.directSlotIndex = directSlotIndex;
    this.isBlocked = isBlocked;
  }
}
```

### Target Acquisition

```js
function findTarget(shooter, framePath) {
  if (shooter.isBlocked) return null;
  if (shooter.shots <= 0) return null;

  const cell = framePath.slots[shooter.directSlotIndex];
  if (cell && cell.color === shooter.color) {
    return shooter.directSlotIndex;
  }

  return null;
}
```

Do not scan all slots on the shooter's side of the frame. A shooter fires only when the directly aligned slot contains a matching cell.

### Simultaneous Shooting

Resolve all shooters in a single firing pass.

Recommended deterministic order:

1. top shooters left to right
2. right shooters top to bottom
3. bottom shooters right to left
4. left shooters bottom to top

Pseudo-code:

```js
function resolveAllShots() {
  const claims = [];

  for (const shooter of shootersInDeterministicOrder) {
    const targetIndex = findTarget(shooter, framePath);
    if (targetIndex !== null) {
      claims.push({ shooter, targetIndex });
    }
  }

  const destroyed = new Set();

  for (const claim of claims) {
    if (destroyed.has(claim.targetIndex)) continue;
    if (!framePath.slots[claim.targetIndex]) continue;

    framePath.slots[claim.targetIndex] = null;
    claim.shooter.shots -= 1;
    destroyed.add(claim.targetIndex);
  }
}
```

## 11. Win / Lose Evaluation

### Win

```js
function hasWon() {
  return grid.remainingCellCount() === 0 && framePath.remainingCellCount() === 0;
}
```

### Lose

```js
function hasLost() {
  return framePath.isFull() && !shooterSystem.hasAnyValidShot();
}
```

## 12. Three.js Rendering Notes

Use simple meshes:

- `BoxGeometry` for grid cells
- `ConeGeometry` or flat triangular mesh for arrow heads
- the same grid cell mesh or same dimensions for frame cells
- `BoxGeometry` or `CylinderGeometry` for shooters
- `TextGeometry`, canvas texture, or bitmap text for shooter numbers

Frame cells must not use a smaller geometry than grid cells. The visual cell size should remain constant while a cell is on the grid, moving out of the grid, waiting at the frame, and moving on the frame path.

Recommended camera:

```js
const camera = new THREE.OrthographicCamera(
  -viewWidth / 2,
  viewWidth / 2,
  viewHeight / 2,
  -viewHeight / 2,
  near,
  far
);
```

Use responsive scaling while preserving 1080 x 1920 layout proportions.

## 13. Playable Ad Constraints

The playable should be lightweight.

Recommended constraints:

- avoid heavy textures
- avoid post-processing
- avoid large external assets
- keep code bundle small
- use simple procedural meshes
- preload everything immediately
- no network calls during gameplay
