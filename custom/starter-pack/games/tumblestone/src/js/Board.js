import * as THREE from 'three';
import { createRoundedRectTexture } from '../../../../reusables/components/VisualUtils.js';

var outlineTexture = null;

function createOutlineTexture() {
    var size = 128;
    var radius = 22;
    var inset = 8;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');

    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 10;
    ctx.shadowColor = 'rgba(255, 255, 255, 0.75)';
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.moveTo(inset + radius, inset);
    ctx.lineTo(size - inset - radius, inset);
    ctx.quadraticCurveTo(size - inset, inset, size - inset, inset + radius);
    ctx.lineTo(size - inset, size - inset - radius);
    ctx.quadraticCurveTo(size - inset, size - inset, size - inset - radius, size - inset);
    ctx.lineTo(inset + radius, size - inset);
    ctx.quadraticCurveTo(inset, size - inset, inset, size - inset - radius);
    ctx.lineTo(inset, inset + radius);
    ctx.quadraticCurveTo(inset, inset, inset + radius, inset);
    ctx.closePath();
    ctx.stroke();

    outlineTexture = new THREE.CanvasTexture(canvas);
    outlineTexture.minFilter = THREE.LinearFilter;
    outlineTexture.magFilter = THREE.LinearFilter;
    return outlineTexture;
}

export function getOutlineTexture() {
    return outlineTexture || createOutlineTexture();
}

export function buildBoard(boardConfig) {
    var group = new THREE.Group();
    var availableWidth = boardConfig.maxWidth - (boardConfig.padding * 2);
    var availableHeight = boardConfig.maxHeight - (boardConfig.padding * 2);
    var cellSizeFromWidth = (availableWidth - ((boardConfig.columns - 1) * boardConfig.gap)) / boardConfig.columns;
    var cellSizeFromHeight = (availableHeight - ((boardConfig.rows - 1) * boardConfig.gap)) / boardConfig.rows;
    var cellSize = Math.min(cellSizeFromWidth, cellSizeFromHeight);
    var boardWidth;
    var boardHeight;
    var boardMesh;
    var cellGeometry;
    var cellMaterial;
    var startX;
    var startY;
    var cellCenters = [];
    var row;
    var column;

    if (cellSize <= 0) {
        throw new Error('Board config leaves no room for cells.');
    }

    boardWidth = (boardConfig.columns * cellSize) + ((boardConfig.columns - 1) * boardConfig.gap) + (boardConfig.padding * 2);
    boardHeight = (boardConfig.rows * cellSize) + ((boardConfig.rows - 1) * boardConfig.gap) + (boardConfig.padding * 2);

    boardMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(boardWidth, boardHeight),
        new THREE.MeshBasicMaterial({
            map: createRoundedRectTexture(128, 18),
            color: new THREE.Color(boardConfig.backgroundColor),
            transparent: true,
            opacity: 0.92
        })
    );
    boardMesh.position.z = -0.02;
    group.add(boardMesh);

    cellGeometry = new THREE.PlaneGeometry(cellSize, cellSize);
    cellMaterial = new THREE.MeshBasicMaterial({
        map: createRoundedRectTexture(64, 12),
        color: new THREE.Color(boardConfig.cellColor),
        transparent: true,
        opacity: 0.68
    });

    startX = (-boardWidth * 0.5) + boardConfig.padding + (cellSize * 0.5);
    startY = (boardHeight * 0.5) - boardConfig.padding - (cellSize * 0.5);

    for (row = 0; row < boardConfig.rows; row += 1) {
        cellCenters[row] = [];

        for (column = 0; column < boardConfig.columns; column += 1) {
            var cellX = startX + (column * (cellSize + boardConfig.gap));
            var cellY = startY - (row * (cellSize + boardConfig.gap));
            var cell = new THREE.Mesh(cellGeometry, cellMaterial);

            cell.position.set(cellX, cellY, 0.01);
            group.add(cell);
            cellCenters[row][column] = { x: cellX, y: cellY };
        }
    }

    group.position.y = boardConfig.offsetY;
    group.userData.boardMetrics = {
        width: boardWidth,
        height: boardHeight,
        cellSize: cellSize,
        columns: boardConfig.columns,
        rows: boardConfig.rows,
        cellCenters: cellCenters,
        gap: boardConfig.gap,
        startX: startX,
        startY: startY
    };

    return group;
}

export function createGrid(rows, columns) {
    var grid = [];
    var row;
    var column;

    for (row = 0; row < rows; row += 1) {
        grid[row] = [];

        for (column = 0; column < columns; column += 1) {
            grid[row][column] = null;
        }
    }

    return grid;
}

export function getCellCenter(boardMetrics, row, column) {
    return boardMetrics.cellCenters[row][column];
}

export function getCellWorldPosition(board, boardMetrics, row, column, z) {
    var center = getCellCenter(boardMetrics, row, column);
    var localPoint = new THREE.Vector3(center.x, center.y, z || 0);

    board.updateMatrixWorld(true);
    return board.localToWorld(localPoint);
}

export function findLowestTileInColumn(grid, column) {
    var row;

    for (row = grid.length - 1; row >= 0; row -= 1) {
        if (grid[row][column]) {
            return grid[row][column];
        }
    }

    return null;
}
