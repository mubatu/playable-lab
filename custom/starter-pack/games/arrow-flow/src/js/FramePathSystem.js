import { stepFramePath } from './FramePath.js';

function finishFrameMove(move) {
    move.view.position.x = move.toX;
    move.view.position.y = move.toY;
}

function updateFrameAnimations(state, delta) {
    var remaining = [];
    var duration = state.config.frame.moveAnimationSeconds || state.config.frame.moveTickSeconds;
    var move;
    var t;
    var i;

    for (i = 0; i < state.activeFrameMoves.length; i += 1) {
        move = state.activeFrameMoves[i];
        move.progress += delta / duration;
        t = Math.min(move.progress, 1);

        move.view.position.x = move.fromX + ((move.toX - move.fromX) * t);
        move.view.position.y = move.fromY + ((move.toY - move.fromY) * t);

        if (move.progress < 1) {
            remaining.push(move);
        } else {
            finishFrameMove(move);
        }
    }

    state.activeFrameMoves = remaining;
}

function startFrameTick(state) {
    var moves = stepFramePath(state.framePath, state.boardMetrics);

    moves.forEach(function (move) {
        state.activeFrameMoves.push(move);
    });
}

export function updateFramePathSystem(state, delta) {
    var tickSeconds = state.config.frame.moveTickSeconds;

    state.frameTickAccumulator += delta;

    while (state.frameTickAccumulator >= tickSeconds) {
        state.frameTickAccumulator -= tickSeconds;
        startFrameTick(state);
    }

    updateFrameAnimations(state, delta);
}
