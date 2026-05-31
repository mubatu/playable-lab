import * as THREE from 'three';
import { createRoundedRectTexture } from '../../../../reusables/components/VisualUtils.js';

var sharedRoundedTexture = null;

function getRoundedTexture() {
    if (!sharedRoundedTexture) {
        sharedRoundedTexture = createRoundedRectTexture(64, 10);
    }
    return sharedRoundedTexture;
}

function makePlane(width, height, color, z, opacity) {
    return new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({
            map: getRoundedTexture(),
            color: new THREE.Color(color),
            transparent: true,
            opacity: typeof opacity === 'number' ? opacity : 1
        })
    );
}

function createCenters(totalRows, totalCols, step) {
    var centers = [];
    var startX = -((totalCols - 1) * step * 0.5);
    var startY = ((totalRows - 1) * step * 0.5);
    var row;
    var col;

    for (row = 0; row < totalRows; row += 1) {
        centers[row] = [];

        for (col = 0; col < totalCols; col += 1) {
            centers[row][col] = {
                x: startX + (col * step),
                y: startY - (row * step)
            };
        }
    }

    return centers;
}

function isOuterRingCoord(metrics, row, col) {
    return row === 0 ||
        col === 0 ||
        row === metrics.totalRows - 1 ||
        col === metrics.totalCols - 1;
}

export function getInnerCoord(gridCoord) {
    return {
        row: gridCoord.row + 1,
        col: gridCoord.col + 1
    };
}

export function getGridCoord(boardCoord) {
    return {
        row: boardCoord.row - 1,
        col: boardCoord.col - 1
    };
}

export function createPerimeterOrder(totalRows, totalCols) {
    var order = [];
    var col;
    var row;

    for (col = 0; col < totalCols; col += 1) {
        order.push({ row: 0, col: col });
    }

    for (row = 1; row < totalRows; row += 1) {
        order.push({ row: row, col: totalCols - 1 });
    }

    for (col = totalCols - 2; col >= 0; col -= 1) {
        order.push({ row: totalRows - 1, col: col });
    }

    for (row = totalRows - 2; row > 0; row -= 1) {
        order.push({ row: row, col: 0 });
    }

    return order;
}

export function getPerimeterIndex(metrics, coord) {
    var key = coord.row + ':' + coord.col;
    return metrics.perimeterIndexByKey[key];
}

export function getBoardCenter(metrics, row, col) {
    return metrics.centers[row][col];
}

export function buildBoard(config, level) {
    var gridConfig = config.grid;
    var rows = level.grid.rows || gridConfig.rows;
    var cols = level.grid.cols || gridConfig.cols;
    var totalRows = rows + 2;
    var totalCols = cols + 2;
    var step = gridConfig.cellSize + gridConfig.cellGap;
    var centers = createCenters(totalRows, totalCols, step);
    var perimeterOrder = createPerimeterOrder(totalRows, totalCols);
    var perimeterIndexByKey = {};
    var boardWidth = (totalCols * gridConfig.cellSize) + ((totalCols - 1) * gridConfig.cellGap) + (gridConfig.boardPadding * 2);
    var boardHeight = (totalRows * gridConfig.cellSize) + ((totalRows - 1) * gridConfig.cellGap) + (gridConfig.boardPadding * 2);
    var group = new THREE.Group();
    var boardBack;
    var metrics;
    var row;
    var col;
    var i;

    metrics = {
        innerRows: rows,
        innerCols: cols,
        totalRows: totalRows,
        totalCols: totalCols,
        cellSize: gridConfig.cellSize,
        cellGap: gridConfig.cellGap,
        cellHeight: gridConfig.cellHeight,
        arrowScale: gridConfig.arrowScale,
        step: step,
        boardWidth: boardWidth,
        boardHeight: boardHeight,
        centers: centers,
        perimeterOrder: perimeterOrder,
        perimeterIndexByKey: perimeterIndexByKey
    };

    for (i = 0; i < perimeterOrder.length; i += 1) {
        perimeterIndexByKey[perimeterOrder[i].row + ':' + perimeterOrder[i].col] = i;
    }

    boardBack = makePlane(boardWidth, boardHeight, config.colors.gridBase, -0.06, 0.86);
    boardBack.position.z = -0.08;
    group.add(boardBack);

    for (row = 0; row < totalRows; row += 1) {
        for (col = 0; col < totalCols; col += 1) {
            var center = centers[row][col];
            var isFrame = isOuterRingCoord(metrics, row, col);
            var color = isFrame ? config.colors.frameEmpty : config.colors.gridCell;
            var opacity = isFrame ? 0.7 : 0.78;
            var cell = makePlane(gridConfig.cellSize, gridConfig.cellSize, color, -0.02, opacity);

            cell.position.set(center.x, center.y, -0.02);
            cell.userData.boardCoord = { row: row, col: col };
            cell.userData.isFrameSlot = isFrame;
            group.add(cell);
        }
    }

    group.position.y = config.camera.boardOffsetY || 0;
    group.userData.boardMetrics = metrics;

    return group;
}
