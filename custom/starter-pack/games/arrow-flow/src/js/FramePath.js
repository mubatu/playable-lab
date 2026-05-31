import { getBoardCenter } from './Board.js';

function coordKey(coord) {
    return coord.row + ':' + coord.col;
}

export function createFramePath(metrics) {
    var slots = [];
    var indexByKey = {};
    var i;

    for (i = 0; i < metrics.perimeterOrder.length; i += 1) {
        slots[i] = null;
        indexByKey[coordKey(metrics.perimeterOrder[i])] = i;
    }

    return {
        slots: slots,
        indexByKey: indexByKey,
        order: metrics.perimeterOrder
    };
}

export function getEntryCoordForGridCell(metrics, gridCell, direction) {
    if (direction === 'up') {
        return { row: 0, col: gridCell.col + 1 };
    }

    if (direction === 'right') {
        return { row: gridCell.row + 1, col: metrics.totalCols - 1 };
    }

    if (direction === 'down') {
        return { row: metrics.totalRows - 1, col: gridCell.col + 1 };
    }

    return { row: gridCell.row + 1, col: 0 };
}

export function getFrameSlotIndex(framePath, coord) {
    return framePath.indexByKey[coordKey(coord)];
}

export function canInsertAtCoord(framePath, coord) {
    var index = getFrameSlotIndex(framePath, coord);
    return typeof index === 'number' && !framePath.slots[index];
}

export function insertCellAtCoord(framePath, metrics, movingCell, coord) {
    var index = getFrameSlotIndex(framePath, coord);
    var center;

    if (typeof index !== 'number' || framePath.slots[index]) {
        return false;
    }

    center = getBoardCenter(metrics, coord.row, coord.col);
    movingCell.view.position.x = center.x;
    movingCell.view.position.y = center.y;
    movingCell.view.userData.frameSlotIndex = index;
    movingCell.view.userData.frameCoord = { row: coord.row, col: coord.col };

    framePath.slots[index] = {
        color: movingCell.color,
        sourceArrowId: movingCell.arrowId,
        view: movingCell.view,
        slotIndex: index,
        coord: { row: coord.row, col: coord.col }
    };

    return true;
}

export function removeCellAtIndex(framePath, index) {
    var cell;

    if (typeof index !== 'number' || index < 0 || index >= framePath.slots.length) {
        return null;
    }

    cell = framePath.slots[index];
    framePath.slots[index] = null;
    return cell;
}

export function stepFramePath(framePath, metrics) {
    var previousSlots = framePath.slots;
    var nextSlots = new Array(previousSlots.length);
    var moves = [];
    var i;
    var nextIndex;
    var cell;
    var fromCoord;
    var toCoord;
    var target;

    for (i = 0; i < previousSlots.length; i += 1) {
        cell = previousSlots[i];

        if (!cell) {
            continue;
        }

        nextIndex = (i + 1) % previousSlots.length;
        fromCoord = framePath.order[i];
        toCoord = framePath.order[nextIndex];
        target = getBoardCenter(metrics, toCoord.row, toCoord.col);

        cell.slotIndex = nextIndex;
        cell.coord = { row: toCoord.row, col: toCoord.col };
        cell.view.userData.frameSlotIndex = nextIndex;
        cell.view.userData.frameCoord = { row: toCoord.row, col: toCoord.col };

        nextSlots[nextIndex] = cell;
        moves.push({
            view: cell.view,
            fromCoord: { row: fromCoord.row, col: fromCoord.col },
            toCoord: { row: toCoord.row, col: toCoord.col },
            fromX: cell.view.position.x,
            fromY: cell.view.position.y,
            toX: target.x,
            toY: target.y,
            progress: 0
        });
    }

    framePath.slots = nextSlots;
    return moves;
}
