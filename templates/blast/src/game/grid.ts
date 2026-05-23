import { GAME_CONFIG } from '../config';

export interface GridCell {
  row: number;
  column: number;
  x: number;
  y: number;
  width: number;
  height: number;
  objectIndex: number;
  objectY: number;
}

export interface GridMetrics {
  x: number;
  y: number;
  width: number;
  height: number;
  cellWidth: number;
  cellHeight: number;
}

export function createGridCells(objectCount: number, targetIndex: number): GridCell[] {
  const metrics = getGridMetrics();
  const cells: GridCell[] = [];

  for (let row = 0; row < GAME_CONFIG.grid.rows; row += 1) {
    for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
      const x = GAME_CONFIG.grid.x + column * (metrics.cellWidth + GAME_CONFIG.grid.gapX);
      const y = GAME_CONFIG.grid.y + row * (metrics.cellHeight + GAME_CONFIG.grid.gapY);

      cells.push({
        row,
        column,
        x,
        y,
        width: metrics.cellWidth,
        height: metrics.cellHeight,
        objectIndex: chooseObjectIndex(objectCount, targetIndex),
        objectY: y + metrics.cellHeight / 2
      });
    }
  }

  ensureTargetCells(cells, targetIndex);
  ensureBlastableGroup(cells, objectCount, targetIndex);

  return cells;
}

export function getGridMetrics(): GridMetrics {
  const totalGapX = GAME_CONFIG.grid.gapX * Math.max(0, GAME_CONFIG.grid.columns - 1);
  const totalGapY = GAME_CONFIG.grid.gapY * Math.max(0, GAME_CONFIG.grid.rows - 1);
  const cellWidth = (GAME_CONFIG.grid.width - totalGapX) / GAME_CONFIG.grid.columns;
  const cellHeight = (GAME_CONFIG.grid.height - totalGapY) / GAME_CONFIG.grid.rows;

  return {
    x: GAME_CONFIG.grid.x,
    y: GAME_CONFIG.grid.y,
    width: GAME_CONFIG.grid.width,
    height: GAME_CONFIG.grid.height,
    cellWidth,
    cellHeight
  };
}

export function getCellAtPoint(cells: GridCell[], x: number, y: number): GridCell | null {
  for (const cell of cells) {
    if (x >= cell.x && x <= cell.x + cell.width && y >= cell.y && y <= cell.y + cell.height) {
      return cell;
    }
  }

  return null;
}

export function findMatchingGroup(cells: GridCell[], startCell: GridCell): GridCell[] {
  const group: GridCell[] = [];
  const visited = new Set<string>();
  const queue = [startCell];

  while (queue.length > 0) {
    const cell = queue.shift()!;
    const key = getCellKey(cell);

    if (visited.has(key) || cell.objectIndex !== startCell.objectIndex) {
      continue;
    }

    visited.add(key);
    group.push(cell);

    for (const neighbor of getNeighborCells(cells, cell)) {
      if (!visited.has(getCellKey(neighbor)) && neighbor.objectIndex === startCell.objectIndex) {
        queue.push(neighbor);
      }
    }
  }

  return group;
}

export function collapseBlastedCells(
  cells: GridCell[],
  blastedCells: GridCell[],
  objectCount: number,
  targetIndex: number,
  targetRemaining: number
): void {
  const blastedKeys = new Set(blastedCells.map(getCellKey));

  for (let column = 0; column < GAME_CONFIG.grid.columns; column += 1) {
    const survivors: Array<{ objectIndex: number; objectY: number }> = [];
    let spawnCount = 0;

    for (let row = GAME_CONFIG.grid.rows - 1; row >= 0; row -= 1) {
      const cell = getCell(cells, row, column);

      if (cell && !blastedKeys.has(getCellKey(cell))) {
        survivors.push({
          objectIndex: cell.objectIndex,
          objectY: cell.objectY
        });
      }
    }

    for (let row = GAME_CONFIG.grid.rows - 1; row >= 0; row -= 1) {
      const cell = getCell(cells, row, column);

      if (cell) {
        const survivor = survivors.shift();

        if (survivor) {
          cell.objectIndex = survivor.objectIndex;
          cell.objectY = survivor.objectY;
        } else {
          spawnCount += 1;
          cell.objectIndex = chooseObjectIndex(objectCount, targetIndex);
          cell.objectY = GAME_CONFIG.grid.y - spawnCount * (cell.height + GAME_CONFIG.grid.gapY) + cell.height / 2;
        }
      }
    }
  }

  if (targetRemaining > 0) {
    ensureTargetCells(cells, targetIndex);
  }

  ensureBlastableGroup(cells, objectCount, targetIndex);
}

export function clampObjectIndex(index: number, objectCount: number): number {
  return Math.max(0, Math.min(objectCount - 1, Math.floor(index)));
}

function ensureTargetCells(cells: GridCell[], targetIndex: number): void {
  const requiredCount = Math.min(GAME_CONFIG.grid.minTargetCells, cells.length);
  let currentCount = cells.filter((cell) => cell.objectIndex === targetIndex).length;

  while (currentCount < requiredCount) {
    const cell = cells[Math.floor(Math.random() * cells.length)];

    if (cell.objectIndex !== targetIndex) {
      cell.objectIndex = targetIndex;
      currentCount += 1;
    }
  }
}

function chooseObjectIndex(objectCount: number, targetIndex: number): number {
  if (Math.random() < GAME_CONFIG.grid.targetSpawnChance) {
    return targetIndex;
  }

  if (objectCount <= 1) return targetIndex;

  let objectIndex = Math.floor(Math.random() * objectCount);

  if (objectIndex === targetIndex) {
    objectIndex = (objectIndex + 1 + Math.floor(Math.random() * (objectCount - 1))) % objectCount;
  }

  return objectIndex;
}

function ensureBlastableGroup(cells: GridCell[], objectCount: number, targetIndex: number): void {
  const requiredCount = Math.max(2, Math.min(GAME_CONFIG.gameplay.minBlastGroupSize, cells.length));

  if (cells.some((cell) => findMatchingGroup(cells, cell).length >= requiredCount)) {
    return;
  }

  const objectIndex = chooseObjectIndex(objectCount, targetIndex);
  const horizontalStart = GAME_CONFIG.grid.columns - requiredCount;

  if (horizontalStart >= 0) {
    const row = Math.floor(Math.random() * GAME_CONFIG.grid.rows);
    const column = Math.floor(Math.random() * (horizontalStart + 1));

    for (let offset = 0; offset < requiredCount; offset += 1) {
      const cell = getCell(cells, row, column + offset);

      if (cell) {
        cell.objectIndex = objectIndex;
      }
    }

    return;
  }

  const verticalStart = GAME_CONFIG.grid.rows - requiredCount;

  if (verticalStart < 0) return;

  const row = Math.floor(Math.random() * (verticalStart + 1));
  const column = Math.floor(Math.random() * GAME_CONFIG.grid.columns);

  for (let offset = 0; offset < requiredCount; offset += 1) {
    const cell = getCell(cells, row + offset, column);

    if (cell) {
      cell.objectIndex = objectIndex;
    }
  }
}

function getNeighborCells(cells: GridCell[], cell: GridCell): GridCell[] {
  return [
    getCell(cells, cell.row - 1, cell.column),
    getCell(cells, cell.row + 1, cell.column),
    getCell(cells, cell.row, cell.column - 1),
    getCell(cells, cell.row, cell.column + 1)
  ].filter((neighbor): neighbor is GridCell => Boolean(neighbor));
}

function getCell(cells: GridCell[], row: number, column: number): GridCell | null {
  if (row < 0 || row >= GAME_CONFIG.grid.rows || column < 0 || column >= GAME_CONFIG.grid.columns) {
    return null;
  }

  return cells[row * GAME_CONFIG.grid.columns + column] ?? null;
}

function getCellKey(cell: GridCell): string {
  return `${cell.row}:${cell.column}`;
}
