var SHAPE_TEMPLATES = [
    [[0, 0]],

    [[0, 0], [0, 1]],
    [[0, 0], [0, 1], [0, 2]],
    [[0, 0], [0, 1], [0, 2], [0, 3]],
    [[0, 0], [0, 1], [0, 2], [0, 3], [0, 4]],

    [[0, 0], [1, 0]],
    [[0, 0], [1, 0], [2, 0]],
    [[0, 0], [1, 0], [2, 0], [3, 0]],
    [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0]],

    [[0, 0], [0, 1], [1, 0], [1, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0], [1, 1], [1, 2], [2, 0], [2, 1], [2, 2]],

    [[0, 0], [1, 0], [2, 0], [2, 1]],
    [[0, 0], [0, 1], [0, 2], [1, 0]],
    [[0, 0], [0, 1], [1, 1], [2, 1]],
    [[0, 2], [1, 0], [1, 1], [1, 2]],

    [[0, 1], [1, 1], [2, 0], [2, 1]],
    [[0, 0], [1, 0], [1, 1], [1, 2]],
    [[0, 0], [0, 1], [1, 0], [2, 0]],
    [[0, 0], [0, 1], [0, 2], [1, 2]],

    [[0, 0], [0, 1], [0, 2], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 0]],
    [[0, 1], [1, 0], [1, 1], [1, 2]],
    [[0, 1], [1, 0], [1, 1], [2, 1]],

    [[0, 1], [0, 2], [1, 0], [1, 1]],
    [[0, 0], [1, 0], [1, 1], [2, 1]],

    [[0, 0], [0, 1], [1, 1], [1, 2]],
    [[0, 1], [1, 0], [1, 1], [2, 0]]
];

function cloneCells(cells) {
    return cells.map(function (cell) {
        return [cell[0], cell[1]];
    });
}

export function getShapeBounds(cells) {
    var minRow = Infinity;
    var maxRow = -Infinity;
    var minCol = Infinity;
    var maxCol = -Infinity;
    var i;

    for (i = 0; i < cells.length; i += 1) {
        if (cells[i][0] < minRow) { minRow = cells[i][0]; }
        if (cells[i][0] > maxRow) { maxRow = cells[i][0]; }
        if (cells[i][1] < minCol) { minCol = cells[i][1]; }
        if (cells[i][1] > maxCol) { maxCol = cells[i][1]; }
    }

    return {
        minRow: minRow,
        maxRow: maxRow,
        minCol: minCol,
        maxCol: maxCol,
        rows: maxRow - minRow + 1,
        cols: maxCol - minCol + 1
    };
}

export function getRandomShape(colors) {
    var templateIndex = Math.floor(Math.random() * SHAPE_TEMPLATES.length);
    var colorIndex = Math.floor(Math.random() * colors.length);

    return {
        cells: cloneCells(SHAPE_TEMPLATES[templateIndex]),
        color: colors[colorIndex]
    };
}

export function generateShapeSet(count, colors) {
    var shapes = [];
    var i;

    for (i = 0; i < count; i += 1) {
        shapes.push(getRandomShape(colors));
    }

    return shapes;
}
