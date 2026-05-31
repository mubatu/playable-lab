var DIRECTION_DELTAS = {
    up: { row: -1, col: 0 },
    right: { row: 0, col: 1 },
    down: { row: 1, col: 0 },
    left: { row: 0, col: -1 }
};

function createEmptyGrid(rows, cols) {
    var cells = [];
    var row;
    var col;

    for (row = 0; row < rows; row += 1) {
        cells[row] = [];

        for (col = 0; col < cols; col += 1) {
            cells[row][col] = null;
        }
    }

    return cells;
}

function isInside(grid, coord) {
    return coord.row >= 0 &&
        coord.col >= 0 &&
        coord.row < grid.rows &&
        coord.col < grid.cols;
}

function getCell(grid, coord) {
    if (!isInside(grid, coord)) {
        return null;
    }

    return grid.cells[coord.row][coord.col];
}

export function hasGridCell(grid, coord) {
    return Boolean(getCell(grid, coord));
}

function setCell(grid, coord, value) {
    if (!isInside(grid, coord)) {
        throw new Error('Grid coordinate is outside level bounds: ' + coord.row + ',' + coord.col);
    }

    grid.cells[coord.row][coord.col] = value;
}

export function removeGridCell(grid, coord) {
    if (!isInside(grid, coord)) {
        return null;
    }

    var existing = grid.cells[coord.row][coord.col];
    grid.cells[coord.row][coord.col] = null;
    return existing;
}

export function nextCell(coord, direction) {
    var delta = DIRECTION_DELTAS[direction];

    if (!delta) {
        throw new Error('Unknown direction: ' + direction);
    }

    return {
        row: coord.row + delta.row,
        col: coord.col + delta.col
    };
}

export function createGridModel(level, arrows) {
    var grid = {
        rows: level.grid.rows,
        cols: level.grid.cols,
        cells: createEmptyGrid(level.grid.rows, level.grid.cols)
    };

    arrows.forEach(function (arrow) {
        arrow.cells.forEach(function (cell) {
            if (getCell(grid, cell)) {
                throw new Error('Multiple arrows occupy grid cell: ' + cell.row + ',' + cell.col);
            }

            setCell(grid, cell, {
                arrowId: arrow.id,
                color: arrow.color
            });
        });
    });

    return grid;
}

export function isArrowClickable(arrow, grid) {
    var cursor = nextCell(arrow.head, arrow.direction);

    while (isInside(grid, cursor)) {
        if (getCell(grid, cursor)) {
            return false;
        }

        cursor = nextCell(cursor, arrow.direction);
    }

    return true;
}

export function refreshArrowClickability(arrows, grid) {
    arrows.forEach(function (arrow) {
        arrow.isClickable = !arrow.isExiting && !arrow.isFullyExited && isArrowClickable(arrow, grid);
    });
}
