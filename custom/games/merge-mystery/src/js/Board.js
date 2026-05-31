import * as THREE from 'three';

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
        throw new Error('Board config leaves no room for square cells. Adjust maxWidth/maxHeight, rows/columns, or gap.');
    }

    boardWidth = (boardConfig.columns * cellSize) + ((boardConfig.columns - 1) * boardConfig.gap) + (boardConfig.padding * 2);
    boardHeight = (boardConfig.rows * cellSize) + ((boardConfig.rows - 1) * boardConfig.gap) + (boardConfig.padding * 2);

    boardMesh = new THREE.Mesh(
        new THREE.PlaneGeometry(boardWidth, boardHeight),
        new THREE.MeshBasicMaterial({
            color: new THREE.Color(boardConfig.backgroundColor)
        })
    );
    group.add(boardMesh);

    cellGeometry = new THREE.PlaneGeometry(cellSize, cellSize);
    cellMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(boardConfig.cellColor)
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
            cellCenters[row][column] = {
                x: cellX,
                y: cellY
            };
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
        dropRadius: (cellSize + boardConfig.gap) * 0.65
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
    var localPoint = new THREE.Vector3(center.x, center.y, z);

    board.updateMatrixWorld(true);
    return board.localToWorld(localPoint);
}
