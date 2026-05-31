# Game Design Document: Tumblestone-Lite (Playable Ad)

## 1. Overview
This project is a simplified, highly engaging playable advertisement based on the core mechanics of *Tumblestone*. The player must collect matching colored tiles from the bottom of vertical columns to clear them. The game is designed for quick sessions with clear, immediate win/loss conditions suitable for user acquisition.

## 2. Technical Specifications
*   **Platform:** Playable Ad (Web/HTML5)
*   **Resolution:** 1080 x 1920 (Portrait orientation)
*   **Asset Directory:** `src/assets`
*   **Configuration:** Core variables (like grid dimensions) must be exposed in `game-config.js` for easy tweaking.

## 3. Core Gameplay Mechanics
### 3.1. Grid System
*   The game board consists of a vertical grid with **5 columns** and **12 rows**.
*   These grid dimensions are completely configurable via `game-config.js`.
*   **Static Grid (No Gravity):** Tiles do not fall when the tile below them is removed. The grid structure remains completely static.
*   **Interaction:** The player can only interact with the **lowest available tile** in each column. 
*   **Visual Affordance:** Every currently interactable tile will feature a **white outline** to clearly indicate to the player that it can be tapped/collected. When a tile is collected, the outline moves to the next available tile directly above it in that column.

### 3.2. Collection & Matching
*   **The Slots:** Above the main grid, there is a dedicated collection area containing **3 empty slots**.
*   **Collecting:** Tapping a valid (outlined) tile removes it from its static position on the grid and places it into the next available slot at the top.
*   **Matching Rule:** The player must fill all 3 slots with tiles of the **exact same color**.
*   **Clearing:** Once 3 identical tiles are successfully placed in the slots, they are cleared (destroyed), freeing up the slots for the next sequence.

## 4. Game States & Progression
### 4.1. Win Condition
*   The player must successfully fill and clear the 3 slots a total of **5 times**.
*   Upon the 5th successful clear, the game triggers the **Win State**.

### 4.2. Loss Condition (Game Over)
*   If the player collects a tile of a *different color* before the current set of 3 is completed and cleared (e.g., collecting a Red tile when there is already a Green tile in the slots), the game immediately triggers the **Game Over (Loss) State**.

### 4.3. Progression UI
*   A **Progress Bar** is displayed at the top of the screen.
*   It includes a text indicator (e.g., `0/5`, `1/5`) that updates dynamically each time a set of 3 tiles is successfully cleared.

## 5. Assets & Visuals
All visual assets will be provided and located in the `src/assets` folder. The required assets include:
*   Background image.
*   Red Tile.
*   Green Tile.
*   Yellow Tile.
*   Purple Tile.
*   White Outline UI element (for interactable tiles).