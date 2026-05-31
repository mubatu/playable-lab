import { snapPieceToCell, setPieceTier } from './Pieces.js';
import { emitMergeParticles } from './ParticleFX.js';
import { refreshHud } from './Hud.js';

function movePieceToCell(state, piece, targetRow, targetColumn) {
    var sourceRow = piece.userData.row;
    var sourceColumn = piece.userData.column;

    state.grid[sourceRow][sourceColumn] = null;
    state.grid[targetRow][targetColumn] = piece;
    snapPieceToCell(state, piece, targetRow, targetColumn);
}

function mergePieces(state, sourcePiece, targetPiece) {
    var sourceRow = sourcePiece.userData.row;
    var sourceColumn = sourcePiece.userData.column;
    var targetRow = targetPiece.userData.row;
    var targetColumn = targetPiece.userData.column;
    var nextTier = targetPiece.userData.tier + 1;

    state.grid[sourceRow][sourceColumn] = null;
    state.piecesGroup.remove(sourcePiece);
    setPieceTier(state, targetPiece, nextTier);
    snapPieceToCell(state, targetPiece, targetRow, targetColumn);
    emitMergeParticles(state, targetRow, targetColumn, nextTier);
    refreshHud(state);
}

function resetDraggedPiece(state, piece, sourceRow, sourceColumn) {
    snapPieceToCell(state, piece, sourceRow, sourceColumn);
}

export function resolvePieceDrop(state, draggedPiece, closestCell, sourceRow, sourceColumn) {
    var targetPiece;
    var canMerge;

    if (!closestCell) {
        resetDraggedPiece(state, draggedPiece, sourceRow, sourceColumn);
        return;
    }

    if (closestCell.row === sourceRow && closestCell.column === sourceColumn) {
        resetDraggedPiece(state, draggedPiece, sourceRow, sourceColumn);
        return;
    }

    targetPiece = state.grid[closestCell.row][closestCell.column];

    if (!targetPiece) {
        movePieceToCell(state, draggedPiece, closestCell.row, closestCell.column);
        return;
    }

    canMerge = (
        targetPiece !== draggedPiece &&
        targetPiece.userData.tier === draggedPiece.userData.tier &&
        draggedPiece.userData.tier < state.maxTier
    );

    if (canMerge) {
        mergePieces(state, draggedPiece, targetPiece);
        return;
    }

    resetDraggedPiece(state, draggedPiece, sourceRow, sourceColumn);
}
