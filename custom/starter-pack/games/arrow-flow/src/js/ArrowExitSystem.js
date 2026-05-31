import { getBoardCenter, getInnerCoord } from './Board.js';
import { nextCell, refreshArrowClickability, removeGridCell } from './GridModel.js';
import { canInsertAtCoord, getEntryCoordForGridCell, insertCellAtCoord } from './FramePath.js';

function sameCoord(a, b) {
    return a.row === b.row && a.col === b.col;
}

function cloneCoord(coord) {
    return {
        row: coord.row,
        col: coord.col
    };
}

function findArrowCellView(arrow, cell) {
    var i;

    for (i = 0; i < arrow.meshes.length; i += 1) {
        if (arrow.meshes[i].userData.gridCoord && sameCoord(arrow.meshes[i].userData.gridCoord, cell)) {
            return arrow.meshes[i];
        }
    }

    return null;
}

function isInsideGrid(metrics, cell) {
    return cell.row >= 0 &&
        cell.col >= 0 &&
        cell.row < metrics.innerRows &&
        cell.col < metrics.innerCols;
}

function buildExitWaypoints(metrics, gridCell, direction) {
    var waypoints = [];
    var cursor = nextCell(gridCell, direction);
    var boardCoord;
    var center;
    var entryCoord;

    while (isInsideGrid(metrics, cursor)) {
        boardCoord = getInnerCoord(cursor);
        center = getBoardCenter(metrics, boardCoord.row, boardCoord.col);
        waypoints.push({
            x: center.x,
            y: center.y
        });
        cursor = nextCell(cursor, direction);
    }

    entryCoord = getEntryCoordForGridCell(metrics, gridCell, direction);
    center = getBoardCenter(metrics, entryCoord.row, entryCoord.col);
    waypoints.push({
        x: center.x,
        y: center.y
    });

    return {
        entryCoord: entryCoord,
        waypoints: waypoints
    };
}

function countActiveCellsForArrow(state, arrowId) {
    var count = 0;
    var i;

    for (i = 0; i < state.movingCells.length; i += 1) {
        if (state.movingCells[i].arrowId === arrowId) {
            count += 1;
        }
    }

    return count;
}

function markArrowFullyExitedIfReady(state, arrow) {
    if (arrow.exitQueue.length === 0 && countActiveCellsForArrow(state, arrow.id) === 0) {
        arrow.isFullyExited = true;
    }
}

function beginMovingCell(state, arrow, gridCell) {
    var view = findArrowCellView(arrow, gridCell);
    var path;
    var target;

    if (!view) {
        return;
    }

    removeGridCell(state.grid, gridCell);
    refreshArrowClickability(state.arrows, state.grid);

    path = buildExitWaypoints(state.boardMetrics, gridCell, arrow.direction);
    target = path.waypoints[0];

    state.movingCells.push({
        arrowId: arrow.id,
        color: arrow.color,
        sourceCell: cloneCoord(gridCell),
        view: view,
        waypoints: path.waypoints,
        waypointIndex: 0,
        fromX: view.position.x,
        fromY: view.position.y,
        toX: target.x,
        toY: target.y,
        progress: 0,
        stepDuration: state.config.arrow.exitAnimationSeconds,
        entryCoord: path.entryCoord,
        waitingForFrameSlot: false
    });
}

function prepareNextSegment(movingCell) {
    var target;

    movingCell.waypointIndex += 1;

    if (movingCell.waypointIndex >= movingCell.waypoints.length) {
        movingCell.waitingForFrameSlot = true;
        return;
    }

    target = movingCell.waypoints[movingCell.waypointIndex];
    movingCell.fromX = movingCell.view.position.x;
    movingCell.fromY = movingCell.view.position.y;
    movingCell.toX = target.x;
    movingCell.toY = target.y;
    movingCell.progress = 0;
}

function tryInsertWaitingCell(state, movingCell) {
    if (!canInsertAtCoord(state.framePath, movingCell.entryCoord)) {
        return false;
    }

    return insertCellAtCoord(state.framePath, state.boardMetrics, movingCell, movingCell.entryCoord);
}

function updateMovingCell(state, movingCell, delta) {
    var t;

    if (movingCell.waitingForFrameSlot) {
        return tryInsertWaitingCell(state, movingCell);
    }

    if (
        movingCell.waypointIndex === movingCell.waypoints.length - 1 &&
        !canInsertAtCoord(state.framePath, movingCell.entryCoord)
    ) {
        return false;
    }

    movingCell.progress += delta / movingCell.stepDuration;
    t = Math.min(movingCell.progress, 1);
    movingCell.view.position.x = movingCell.fromX + ((movingCell.toX - movingCell.fromX) * t);
    movingCell.view.position.y = movingCell.fromY + ((movingCell.toY - movingCell.fromY) * t);

    if (movingCell.progress < 1) {
        return false;
    }

    if (movingCell.waypointIndex === movingCell.waypoints.length - 1) {
        movingCell.waitingForFrameSlot = true;
        return tryInsertWaitingCell(state, movingCell);
    }

    prepareNextSegment(movingCell);
    return false;
}

function updateMovingCells(state, delta) {
    var remaining = [];
    var inserted;
    var i;

    for (i = 0; i < state.movingCells.length; i += 1) {
        inserted = updateMovingCell(state, state.movingCells[i], delta);

        if (!inserted) {
            remaining.push(state.movingCells[i]);
        }
    }

    state.movingCells = remaining;
}

function updateExitQueues(state, delta) {
    var i;
    var arrow;
    var nextGridCell;

    for (i = 0; i < state.exitingArrows.length; i += 1) {
        arrow = state.exitingArrows[i];
        arrow.exitTimer += delta;

        while (arrow.exitTimer >= state.config.arrow.exitIntervalSeconds && arrow.exitQueue.length > 0) {
            arrow.exitTimer -= state.config.arrow.exitIntervalSeconds;
            nextGridCell = arrow.exitQueue.shift();
            beginMovingCell(state, arrow, nextGridCell);
        }

        markArrowFullyExitedIfReady(state, arrow);
    }

    state.exitingArrows = state.exitingArrows.filter(function (item) {
        return !item.isFullyExited;
    });
}

export function startArrowExit(state, arrow) {
    if (!arrow || arrow.isExiting || arrow.isFullyExited) {
        return false;
    }

    arrow.isExiting = true;
    arrow.exitTimer = state.config.arrow.exitIntervalSeconds;
    arrow.exitQueue = arrow.exitQueue.map(cloneCoord);

    if (arrow.headMarker) {
        arrow.headMarker.visible = false;
    }

    state.exitingArrows.push(arrow);
    refreshArrowClickability(state.arrows, state.grid);

    return true;
}

export function updateArrowExitSystem(state, delta) {
    updateExitQueues(state, delta);
    updateMovingCells(state, delta);
}
