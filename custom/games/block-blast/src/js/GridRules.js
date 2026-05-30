import { getCellCenter } from './Board.js';
import { createBlockMesh } from './ShapeRenderer.js';

export function canPlaceShape(grid, cells, anchorRow, anchorCol) {
    var rows = grid.length;
    var cols = grid[0].length;
    var i;
    var cellRow;
    var cellCol;

    for (i = 0; i < cells.length; i += 1) {
        cellRow = anchorRow + cells[i][0];
        cellCol = anchorCol + cells[i][1];

        if (cellRow < 0 || cellRow >= rows || cellCol < 0 || cellCol >= cols) {
            return false;
        }

        if (grid[cellRow][cellCol] !== null) {
            return false;
        }
    }

    return true;
}

export function placeShapeOnGrid(state, shape, anchorRow, anchorCol) {
    var visualSize = state.boardMetrics.cellSize * 0.92;
    var placedMeshes = [];
    var i;
    var cellRow;
    var cellCol;
    var center;
    var mesh;

    for (i = 0; i < shape.cells.length; i += 1) {
        cellRow = anchorRow + shape.cells[i][0];
        cellCol = anchorCol + shape.cells[i][1];
        center = getCellCenter(state.boardMetrics, cellRow, cellCol);

        mesh = createBlockMesh(visualSize, shape.color, state.config.shapes.baseZ);
        mesh.position.set(center.x, center.y, state.config.shapes.baseZ);
        mesh.userData.gridRow = cellRow;
        mesh.userData.gridCol = cellCol;
        mesh.userData.isBlock = true;

        state.piecesGroup.add(mesh);
        state.grid[cellRow][cellCol] = mesh;
        placedMeshes.push(mesh);
    }

    return placedMeshes;
}

export function checkAndClearLines(state) {
    var rows = state.config.board.rows;
    var cols = state.config.board.columns;
    var fullRows = [];
    var fullCols = [];
    var cellsToClear = {};
    var row;
    var col;
    var isFull;
    var key;
    var mesh;
    var clearedCount = 0;

    for (row = 0; row < rows; row += 1) {
        isFull = true;
        for (col = 0; col < cols; col += 1) {
            if (state.grid[row][col] === null) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            fullRows.push(row);
        }
    }

    for (col = 0; col < cols; col += 1) {
        isFull = true;
        for (row = 0; row < rows; row += 1) {
            if (state.grid[row][col] === null) {
                isFull = false;
                break;
            }
        }
        if (isFull) {
            fullCols.push(col);
        }
    }

    for (var ri = 0; ri < fullRows.length; ri += 1) {
        row = fullRows[ri];
        for (col = 0; col < cols; col += 1) {
            cellsToClear[row + ',' + col] = { row: row, col: col };
        }
    }

    for (var ci = 0; ci < fullCols.length; ci += 1) {
        col = fullCols[ci];
        for (row = 0; row < rows; row += 1) {
            cellsToClear[row + ',' + col] = { row: row, col: col };
        }
    }

    var clearList = [];
    for (key in cellsToClear) {
        if (Object.prototype.hasOwnProperty.call(cellsToClear, key)) {
            clearList.push(cellsToClear[key]);
        }
    }

    for (var k = 0; k < clearList.length; k += 1) {
        row = clearList[k].row;
        col = clearList[k].col;
        mesh = state.grid[row][col];

        if (mesh) {
            state.piecesGroup.remove(mesh);
            mesh.geometry.dispose();
            mesh.material.dispose();
            state.grid[row][col] = null;
            clearedCount += 1;
        }
    }

    return {
        linesCleared: fullRows.length + fullCols.length,
        cellsCleared: clearedCount,
        clearedPositions: clearList
    };
}

export function canShapeFitAnywhere(grid, cells) {
    var rows = grid.length;
    var cols = grid[0].length;
    var row;
    var col;

    for (row = 0; row < rows; row += 1) {
        for (col = 0; col < cols; col += 1) {
            if (canPlaceShape(grid, cells, row, col)) {
                return true;
            }
        }
    }

    return false;
}

export function canAnySlotFit(grid, spawnSlots) {
    var i;

    for (i = 0; i < spawnSlots.length; i += 1) {
        if (!spawnSlots[i].placed && canShapeFitAnywhere(grid, spawnSlots[i].shape.cells)) {
            return true;
        }
    }

    return false;
}
