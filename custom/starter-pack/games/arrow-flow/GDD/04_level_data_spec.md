# Level Data Specification

Levels should be stored separately from game logic so the playable can be adjusted quickly.

## Example `level-data.js`

```js
export const LEVELS = [
  {
    id: 'level_001_intro',
    grid: {
      rows: 4,
      cols: 3
    },
    arrows: [
      {
        id: 'pink_down_01',
        color: 'pink',
        direction: 'down',
        head: { row: 2, col: 0 },
        cells: [
          { row: 0, col: 0 },
          { row: 1, col: 0 },
          { row: 2, col: 0 }
        ]
      },
      {
        id: 'yellow_down_01',
        color: 'yellow',
        direction: 'down',
        head: { row: 2, col: 1 },
        cells: [
          { row: 0, col: 1 },
          { row: 1, col: 1 },
          { row: 2, col: 1 }
        ]
      },
      {
        id: 'yellow_left_01',
        color: 'yellow',
        direction: 'left',
        head: { row: 3, col: 0 },
        cells: [
          { row: 3, col: 2 },
          { row: 3, col: 1 },
          { row: 3, col: 0 }
        ]
      }
    ],
    frame: {
      slotCount: 28,
      entrySlotIndex: 0
    },
    shooters: [
      {
        id: 'pink_top_01',
        color: 'pink',
        shots: 6,
        side: 'top',
        laneIndex: 0,
        isBlocked: false,
        directSlotIndex: 4,
        visibleSlots: [4]
      },
      {
        id: 'yellow_top_01',
        color: 'yellow',
        shots: 6,
        side: 'top',
        laneIndex: 1,
        isBlocked: false,
        directSlotIndex: 9,
        visibleSlots: [9]
      }
    ]
  }
];
```

## Arrow Fields

Each arrow requires:

- `id`: unique string
- `color`: color key from `CONFIG.colors`
- `direction`: `up`, `down`, `left`, or `right`
- `head`: grid coordinate of arrow head
- `cells`: list of grid coordinates occupied by the arrow

The `cells` array does not have to be head-first, but the loader should normalize exit order.

## Shooter Fields

Each shooter requires:

- `id`: unique string
- `color`: color key from `CONFIG.colors`
- `shots`: remaining shot count at level start
- `side`: top, right, bottom, or left
- `laneIndex`: visual placement index on that side
- `isBlocked`: whether another shooter blocks its sight
- `directSlotIndex`: frame slot directly in front of the shooter
- `visibleSlots`: optional/debug list; for gameplay it should contain only `directSlotIndex`

Shooter data must not define an entire side of the frame as targetable. A shooter should destroy a matching cell only when that cell occupies `directSlotIndex`.

## Frame Fields

Each level may override:

- `slotCount`
- `entrySlotIndex`
- `moveTickSeconds`

## Validation Rules

The level loader should validate:

- arrow IDs are unique
- shooter IDs are unique
- all arrow cells are inside the grid
- no two arrows occupy the same grid cell
- each arrow head is one of its cells
- each arrow direction is valid
- each shooter color exists in config
- each shooter direct slot is inside frame slot range
- if `visibleSlots` is provided, it contains exactly one slot and matches `directSlotIndex`
- total shooter shots should be enough to destroy all cells of matching colors, unless the level intentionally allows failure

## Recommended Prototype Levels

### Level 1: Teaching Level

- 2 colors
- 2 shooters
- 3 or 4 arrows
- at least one obvious clickable arrow
- enough frame space to avoid immediate loss

### Level 2: Shooter Blocking Level

- introduce front and rear shooters
- rear shooter cannot fire because another shooter blocks line of sight
- player learns that only visible shooters matter

### Level 3: Capacity Pressure Level

- smaller frame capacity
- requires release order planning
- should still be solvable in under 30 seconds
