import * as THREE from 'three';
import { getCellCenter } from './Board.js';

export function createPieceMaterials(textures) {
    return textures.map(function (texture) {
        return new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            alphaTest: 0.05
        });
    });
}

export function setPieceTier(state, piece, tier) {
    piece.userData.tier = tier;
    piece.material = state.pieceMaterials[tier - 1];
}

export function snapPieceToCell(state, piece, row, column) {
    var center = getCellCenter(state.boardMetrics, row, column);

    piece.position.set(center.x, center.y, state.config.pieces.baseZ);
    piece.scale.setScalar(1);
    piece.userData.row = row;
    piece.userData.column = column;
}

export function createPiece(state, row, column, tier) {
    var piece = new THREE.Mesh(state.pieceGeometry, state.pieceMaterials[tier - 1]);
    piece.userData = {
        isPiece: true,
        tier: tier,
        row: row,
        column: column
    };

    snapPieceToCell(state, piece, row, column);
    state.grid[row][column] = piece;
    state.piecesGroup.add(piece);
    return piece;
}

export function clearBoardPieces(state) {
    var row;
    var column;

    while (state.piecesGroup.children.length) {
        state.piecesGroup.remove(state.piecesGroup.children[0]);
    }

    for (row = 0; row < state.grid.length; row += 1) {
        for (column = 0; column < state.grid[row].length; column += 1) {
            state.grid[row][column] = null;
        }
    }
}

export function populateInitialPieces(state) {
    var initialTier = state.config.pieces.initialTier || 1;
    var row;
    var column;

    for (row = 0; row < state.config.board.rows; row += 1) {
        for (column = 0; column < state.config.board.columns; column += 1) {
            createPiece(state, row, column, initialTier);
        }
    }
}

export function findHighestTier(state) {
    var highestTier = 1;
    var row;
    var column;

    for (row = 0; row < state.grid.length; row += 1) {
        for (column = 0; column < state.grid[row].length; column += 1) {
            if (state.grid[row][column]) {
                highestTier = Math.max(highestTier, state.grid[row][column].userData.tier);
            }
        }
    }

    return highestTier;
}
