import { GameStateName } from './GameState.js';
import { refreshCellDisplay, showEndOverlay } from './Hud.js';
import { canAnyShooterFire } from './ShooterSystem.js';

function countGridCells(grid) {
    var total = 0;
    var row;
    var col;

    for (row = 0; row < grid.rows; row += 1) {
        for (col = 0; col < grid.cols; col += 1) {
            if (grid.cells[row][col]) {
                total += 1;
            }
        }
    }

    return total;
}

function countFrameCells(framePath) {
    var total = 0;
    var i;

    for (i = 0; i < framePath.slots.length; i += 1) {
        if (framePath.slots[i]) {
            total += 1;
        }
    }

    return total;
}

function isFrameFull(framePath) {
    return countFrameCells(framePath) === framePath.slots.length;
}

function getRemainingCellCount(state) {
    return countGridCells(state.grid) + state.movingCells.length + countFrameCells(state.framePath);
}

function endGame(state, stateName, reason) {
    if (state.stateName !== GameStateName.PLAYING) {
        return;
    }

    state.stateName = stateName;
    state.terminalReason = reason;
    showEndOverlay(state, reason);
}

export function updateWinLoseSystem(state, delta) {
    if (state.stateName !== GameStateName.PLAYING) {
        return;
    }

    state.sessionSeconds += delta;
    state.remainingCells = getRemainingCellCount(state);
    refreshCellDisplay(state);

    if (state.remainingCells === 0) {
        endGame(state, GameStateName.WIN, 'win');
        return;
    }

    if (
        state.config.playableAd.maxSessionSeconds > 0 &&
        state.sessionSeconds >= state.config.playableAd.maxSessionSeconds
    ) {
        endGame(state, GameStateName.LOSE, 'timeout');
        return;
    }

    if (
        state.config.frame.loseOnlyWhenFullAndNoShot &&
        isFrameFull(state.framePath) &&
        !canAnyShooterFire(state)
    ) {
        endGame(state, GameStateName.LOSE, 'lose');
    }
}
