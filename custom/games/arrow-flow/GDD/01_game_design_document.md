# Arrow Flow-Style Playable Ad Prototype — Game Design Document

## 1. Overview

This document describes a lightweight prototype for a playable ad inspired by the core mechanics shown in the reference screenshots and clarified by the designer.

The project is not intended to be a visually polished production game. The goal is to implement the core puzzle mechanics clearly using simple 3D geometry in Three.js.

## 2. Product Context

- **Format:** Playable ad
- **Engine / Rendering:** Three.js
- **Target resolution:** 1080 x 1920 portrait
- **Prototype priority:** Mechanics first, simple visuals
- **Primary goal:** Let the player understand the puzzle quickly and interact within a short ad session

## 3. Core Fantasy

The player clears colored arrow blocks from a grid by releasing them onto a surrounding frame path. Once on the frame, colored cells circulate until matching colored shooters destroy them. The challenge is to release arrows in an order that avoids filling the frame with cells that cannot currently be destroyed.

## 4. Core Gameplay Loop

1. Player observes arrows on the grid.
2. Player identifies arrows whose head direction is unobstructed.
3. Player clicks/taps a clickable arrow.
4. The clicked arrow exits the grid cell by cell, head first.
5. Arrow cells travel through the grid in their arrow direction until they reach the aligned surrounding frame slot.
6. Frame cells move step by step along the path over time.
7. Shooters fire immediately when a matching colored cell occupies the exact frame slot directly in front of them.
8. Destroyed cells are removed from the frame.
9. Player continues releasing arrows until all cells are destroyed.
10. Player wins if all arrow cells are destroyed.
11. Player loses if the frame is full and no shooter can destroy any visible cell.

## 5. Win and Lose Conditions

### Win Condition

The player wins only when **all arrow cells are fully destroyed**.

It is not enough for arrows to leave the grid. If cells are still moving on the frame, the level is not complete.

### Lose Condition

The player loses when:

- the frame is full, and
- no shooter can currently destroy any cell.

If the frame is full but at least one shooter can destroy a matching visible cell, the game should continue because the jam may resolve.

## 6. Grid Arrows

### Arrow Structure

An arrow is made of one or more same-colored cells on the grid.

Each arrow has:

- color
- list of grid cells
- head cell
- direction
- clickable state

### Arrow Direction

Each arrow points in one of four grid directions:

- up
- down
- left
- right

### Clickability Rule

An arrow is clickable only if the direction its head points toward is unobstructed.

Only cells directly in front of the arrow head block the arrow. Neighboring cells beside or behind the arrow do not block it.

### Arrow Exit Rule

When the player clicks a valid arrow:

- the arrow begins exiting the grid cell by cell
- the head exits first
- each following body cell exits after the previous cell
- one player click is enough to schedule the full arrow to exit
- each arrow cell must move through grid-space cell positions in the arrow direction before joining the frame
- arrow cells must not teleport to a shared frame starter point
- each arrow enters the frame through the nearest/aligned frame slot on the side it exits from

The player does not need to click each cell individually.

## 7. Frame Path

### Frame Concept

The frame is a discrete path surrounding the grid. Arrow cells enter this path after leaving the grid.

For the prototype, the frame can be represented as an ordered list of slots.

### Movement

- Movement is discrete.
- Movement happens every time unit.
- Cells advance along the frame path by one slot per movement tick.
- Cells cannot overtake each other.
- The frame behaves like a continuous ordered path with limited capacity.
- Adjacent cells must remain adjacent as they move. The movement system must not create an empty slot between cells that were contiguous unless a cell was destroyed.
- Cells released from the same arrow should enter and follow the frame as a compact sequence, subject only to blocking by occupied frame slots or shooter destruction.

### Frame Capacity

The frame has a maximum number of slots. A slot can contain zero or one cell.

The frame is considered full when every slot is occupied.

## 8. Cell Behavior

Once an arrow cell enters the frame, it becomes an independent cell.

If a shooter destroys a cell from the middle of a former arrow, the remaining cells do not need to stay connected. The original arrow identity no longer matters after the cells enter the frame.

Each frame cell stores:

- color
- current frame slot index
- movement state
- optional reference to source arrow for debugging only

## 9. Shooters

### Shooter Structure

Each shooter has:

- color
- remaining shots
- line-of-sight direction
- position around the frame
- blocked/unblocked visibility state based on placement

### Shooter Visibility

A shooter fires only if it has a clear straight line of sight to the frame.

If another shooter is physically in front of it, the rear shooter cannot see the frame and cannot fire.

Example from reference: if purple and pink shooters are behind orange and green shooters, only orange and green can fire.

### Firing Rule

A shooter can fire only at a cell of the same color.

When a matching cell appears in the exact frame slot directly in front of the shooter:

- the shooter fires immediately
- it targets that directly aligned slot only
- the target cell is destroyed
- the shooter remaining shot count decreases by 1

A shooter must not scan or destroy any matching cell elsewhere on the same side of the frame. For example, a top-side shooter aligned with one top frame slot fires only when a matching cell occupies that one slot, not when the cell is anywhere along the top edge.

### Multiple Shooters

Multiple shooters can fire during the same time step.

For the prototype, simultaneous firing should be resolved deterministically. Recommended approach:

1. collect all valid shooter targets for the current tick
2. if multiple shooters target different cells, destroy all of them
3. if multiple shooters target the same cell, allow only the first shooter by deterministic order to consume the target
4. update remaining shot counts

## 10. Shooter Shot Counts

The number displayed on a shooter is its remaining shot count.

When the count reaches zero:

- the shooter becomes inactive
- it should no longer fire
- it may remain visible as an empty shooter for clarity

## 11. Input

The primary input is tap/click.

On tap:

1. raycast against grid arrow cells or arrow group collider
2. identify the arrow owning the tapped cell
3. check whether the arrow is currently clickable
4. if clickable, start the arrow exit sequence
5. if not clickable, optionally give lightweight feedback

## 12. Prototype Visual Requirements

Since this is a mechanics prototype, use simple shapes:

- grid cells: colored boxes
- arrow heads: colored wedge, cone, triangle marker, or a small arrow symbol on top
- frame slots: simple rounded or square path markers
- frame cells: the same colored cell visual used on the grid
- shooters: colored boxes/cylinders with text number
- background: solid color

Arrow cells must keep the same visual size and core mesh from grid travel to frame travel. Do not shrink, replace, or restyle cells when they enter the frame path; only their position/path state changes.

Visual polish is not required for the prototype.

## 13. UX Requirements for Playable Ad

The playable ad should communicate the mechanic quickly.

Recommended first level:

- very few arrows
- clear first valid tap
- avoid complex shooter blocking initially
- ensure the player can win in a few interactions

Recommended ad flow:

1. show interactive puzzle immediately
2. optionally pulse the first clickable arrow after 1.5 seconds of inactivity
3. allow the player to play until win or lose
4. show end card / call-to-action after completion or timeout

## 14. Non-Goals

The prototype does not need:

- advanced art
- complex animation polish
- monetization logic
- persistent progression
- level editor UI
- sound design unless trivial
- full mobile app packaging
