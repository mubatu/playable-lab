import { placeShapeOnGrid, checkAndClearLines, canAnySlotFit, canPlaceShape } from './GridRules.js';
import { emitClearParticles, startScreenShake } from './ParticleFX.js';
import { addScore, showGameOver } from './Hud.js';
import { refreshSpawnSlots } from './SpawnSlots.js';

function allSlotsPlaced(state) {
    var i;

    for (i = 0; i < state.spawnSlots.length; i += 1) {
        if (!state.spawnSlots[i].placed) {
            return false;
        }
    }

    return true;
}

export function tryPlaceDraggedShape(state, drag) {
    var anchor = drag.currentAnchor;
    var slot = state.spawnSlots[drag.slotIndex];
    var clearResult;
    var points;

    if (!anchor || !canPlaceShape(state.grid, drag.shape.cells, anchor.row, anchor.col)) {
        return false;
    }

    placeShapeOnGrid(state, drag.shape, anchor.row, anchor.col);
    slot.placed = true;

    points = drag.shape.cells.length * state.config.scoring.cellPoints;
    clearResult = checkAndClearLines(state);

    if (clearResult.linesCleared > 0) {
        points += clearResult.linesCleared * state.config.scoring.linePoints * state.config.board.columns;

        if (clearResult.linesCleared > 1) {
            points += (clearResult.linesCleared - 1) * state.config.scoring.bonusPerExtraLine * state.config.board.columns;
        }

        emitClearParticles(state, clearResult.clearedPositions);
        startScreenShake(state, 0.15 + clearResult.linesCleared * 0.05);
    }

    addScore(state, points);

    if (allSlotsPlaced(state)) {
        refreshSpawnSlots(state);
    }

    if (!canAnySlotFit(state.grid, state.spawnSlots)) {
        showGameOver(state);
    }

    return true;
}
