import { getInnerCoord } from './Board.js';

var DIRECTION_SCORE = {
    up: function (cell) { return -cell.row; },
    down: function (cell) { return cell.row; },
    left: function (cell) { return -cell.col; },
    right: function (cell) { return cell.col; }
};

function normalizeCell(cell) {
    return {
        row: cell.row,
        col: cell.col
    };
}

function orderCellsHeadFirst(arrowData) {
    var scorer = DIRECTION_SCORE[arrowData.direction];
    return arrowData.cells.map(normalizeCell).sort(function (a, b) {
        return scorer(b) - scorer(a);
    });
}

export function createArrowModels(level) {
    return level.arrows.map(function (arrowData) {
        return {
            id: arrowData.id,
            color: arrowData.color,
            direction: arrowData.direction,
            head: normalizeCell(arrowData.head),
            cells: arrowData.cells.map(normalizeCell),
            exitQueue: orderCellsHeadFirst(arrowData),
            boardCells: arrowData.cells.map(function (cell) {
                return getInnerCoord(cell);
            }),
            meshes: [],
            headMarker: null,
            isClickable: false,
            isExiting: false,
            isFullyExited: false
        };
    });
}
