# Playable Ad Implementation Checklist

## Core Setup

- [ ] Create Three.js scene
- [ ] Create orthographic portrait camera
- [ ] Set renderer to 1080 x 1920 base resolution
- [ ] Add resize handling while preserving portrait layout
- [ ] Add `game-config.js`
- [ ] Add `level-data.js`

## Grid and Arrows

- [ ] Render grid base
- [ ] Render colored arrow cells as simple boxes
- [ ] Render arrow heads/direction markers
- [ ] Store grid occupancy map
- [ ] Implement arrow ownership per cell
- [ ] Implement click/tap raycasting
- [ ] Implement arrow clickability check
- [ ] Implement invalid tap feedback
- [ ] Implement head-first cell exit queue
- [ ] Move exiting cells through grid cell waypoints before frame insertion
- [ ] Route each arrow to the aligned frame slot on the side it exits from
- [ ] Prevent teleporting all arrows to one shared frame starter point
- [ ] Keep arrow cell visual size unchanged during grid exit and frame movement

## Frame Path

- [ ] Create discrete frame slot data structure
- [ ] Render frame path visually
- [ ] Render cells on frame slots
- [ ] Insert arrow cells into their aligned side/lane frame slot
- [ ] Move cells one discrete step per tick
- [ ] Move contiguous cells as a compact train without creating one-slot gaps
- [ ] Prevent overtaking
- [ ] Detect frame full state

## Shooters

- [ ] Render shooters as simple colored blocks/cylinders
- [ ] Render shot count numbers
- [ ] Support blocked shooters
- [ ] Define one direct target frame slot per shooter
- [ ] Implement same-color target check only on the direct target slot
- [ ] Prevent shooters from scanning the whole side of the frame
- [ ] Implement immediate firing
- [ ] Implement simultaneous shooter resolution
- [ ] Decrease shot count only after successful destruction
- [ ] Disable shooter at zero shots

## Win / Lose

- [ ] Win only when grid and frame have zero cells
- [ ] Lose only when frame is full and no shooter has any valid shot
- [ ] Show simple win overlay
- [ ] Show simple lose overlay
- [ ] Show playable ad CTA overlay

## Prototype UX

- [ ] Add first-click hint after inactivity
- [ ] Add simple cell destruction animation
- [ ] Add simple arrow exit animation
- [ ] Add simple shooter fire animation

## Playable Ad Constraints

- [ ] Keep all assets local or procedural
- [ ] Avoid heavy textures
- [ ] Avoid post-processing
- [ ] Avoid network calls during gameplay
- [ ] Keep bundle small
- [ ] Ensure fast load time
- [ ] Test on mobile portrait viewport
- [ ] Test touch input
- [ ] Test browser compatibility

## Acceptance Criteria

The prototype is acceptable when:

- arrows are clickable only when their head direction is unobstructed
- clicked arrows leave the grid head first, cell by cell
- clicked arrow cells visibly move through grid cells before reaching the frame
- clicked arrow cells do not teleport to a global frame starter point
- arrow cells keep the same size in the grid, during exit, and on the frame path
- frame cells move discretely and cannot overtake
- adjacent frame cells remain adjacent unless one is destroyed or blocked from entering
- shooters immediately destroy only matching cells in their direct target slot
- shooters do not destroy matching cells elsewhere on the same frame side
- multiple shooters can shoot on the same tick
- cells become independent after entering the frame
- the player wins only when all cells are destroyed
- the player loses only when the frame is full and no shooter can destroy anything
- key variables are exposed in `game-config.js`
- the prototype runs in 1080 x 1920 portrait layout
