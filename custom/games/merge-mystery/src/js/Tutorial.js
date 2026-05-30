import * as THREE from 'three';
import { getCellWorldPosition } from './Board.js';

function clearTutorialDelay(state) {
    if (state.tutorialDelayId) {
        window.clearTimeout(state.tutorialDelayId);
        state.tutorialDelayId = null;
    }
}

export function destroyTutorial(state) {
    clearTutorialDelay(state);

    if (state.tutorial) {
        state.tutorial.destroy();
        state.tutorial = null;
    }

    if (window.MergeMystery) {
        window.MergeMystery.tutorial = null;
    }
}

function getCellWorldPointConfig(state, row, column, z) {
    var worldPosition;

    if (
        typeof row !== 'number' ||
        typeof column !== 'number' ||
        row < 0 ||
        column < 0 ||
        row >= state.grid.length ||
        column >= state.grid[0].length
    ) {
        return null;
    }

    worldPosition = getCellWorldPosition(
        state.board,
        state.boardMetrics,
        row,
        column,
        typeof z === 'number' ? z : state.config.pieces.baseZ
    );

    return {
        space: 'world',
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z
    };
}

function resolveTutorialPoint(state, pointConfig) {
    if (!pointConfig) {
        return null;
    }

    if (pointConfig.space === 'grid') {
        return getCellWorldPointConfig(state, pointConfig.row, pointConfig.column, pointConfig.z);
    }

    if (pointConfig.space === 'world') {
        return {
            space: 'world',
            x: typeof pointConfig.x === 'number' ? pointConfig.x : 0,
            y: typeof pointConfig.y === 'number' ? pointConfig.y : 0,
            z: typeof pointConfig.z === 'number' ? pointConfig.z : state.config.pieces.baseZ
        };
    }

    if (pointConfig.space === 'pixels') {
        return {
            space: 'pixels',
            x: typeof pointConfig.x === 'number' ? pointConfig.x : 0,
            y: typeof pointConfig.y === 'number' ? pointConfig.y : 0
        };
    }

    if (pointConfig.space === 'screen') {
        return {
            space: 'screen',
            x: typeof pointConfig.x === 'number' ? pointConfig.x : 0.5,
            y: typeof pointConfig.y === 'number' ? pointConfig.y : 0.5
        };
    }

    if (typeof pointConfig.row === 'number' && typeof pointConfig.column === 'number') {
        return getCellWorldPointConfig(state, pointConfig.row, pointConfig.column, pointConfig.z);
    }

    if (typeof pointConfig.x !== 'number' || typeof pointConfig.y !== 'number') {
        return null;
    }

    return {
        space: 'screen',
        x: pointConfig.x,
        y: pointConfig.y
    };
}

function getPieceTutorialPoint(piece) {
    var worldPosition = new THREE.Vector3();

    piece.getWorldPosition(worldPosition);

    return {
        space: 'world',
        x: worldPosition.x,
        y: worldPosition.y,
        z: worldPosition.z
    };
}

function getAutoTutorialPair(state) {
    var row;
    var column;
    var piece;
    var rightPiece;
    var downPiece;

    for (row = 0; row < state.grid.length; row += 1) {
        for (column = 0; column < state.grid[row].length; column += 1) {
            piece = state.grid[row][column];

            if (!piece) {
                continue;
            }

            rightPiece = column + 1 < state.grid[row].length
                ? state.grid[row][column + 1]
                : null;

            if (rightPiece && rightPiece.userData.tier === piece.userData.tier) {
                return {
                    from: piece,
                    to: rightPiece
                };
            }

            downPiece = row + 1 < state.grid.length
                ? state.grid[row + 1][column]
                : null;

            if (downPiece && downPiece.userData.tier === piece.userData.tier) {
                return {
                    from: piece,
                    to: downPiece
                };
            }
        }
    }

    return null;
}

function getTutorialPair(state) {
    var tutorialConfig = state.config.tutorial || {};
    var configuredFromPoint = resolveTutorialPoint(state, tutorialConfig.from);
    var configuredToPoint = resolveTutorialPoint(state, tutorialConfig.to);
    var autoPair;

    if (configuredFromPoint && configuredToPoint) {
        return {
            from: configuredFromPoint,
            to: configuredToPoint
        };
    }

    autoPair = getAutoTutorialPair(state);

    if (!autoPair) {
        return null;
    }

    return {
        from: getPieceTutorialPoint(autoPair.from),
        to: getPieceTutorialPoint(autoPair.to)
    };
}

function ensureTutorial(state) {
    var tutorialConfig = state.config.tutorial || {};
    var pair;

    if (!tutorialConfig.enabled || state.hasUserInteracted || !window.HandTutorial) {
        destroyTutorial(state);
        return;
    }

    pair = getTutorialPair(state);

    if (!pair) {
        destroyTutorial(state);
        return;
    }

    if (!state.tutorial) {
        state.tutorial = new window.HandTutorial({
            container: state.renderer.domElement.parentElement,
            renderer: state.renderer,
            camera: state.camera,
            assetUrl: tutorialConfig.assetUrl,
            gesture: tutorialConfig.gesture || 'drag',
            duration: tutorialConfig.duration || 1.1,
            loop: true,
            loopDelay: tutorialConfig.loopDelay || 0.4,
            size: tutorialConfig.size || 132,
            rotation: 0,
            followDirection: false,
            flipX: false,
            showTrail: true,
            anchor: { x: 0.22, y: 0.08 },
            from: pair.from,
            to: pair.to
        });
    } else {
        state.tutorial.setConfig({
            assetUrl: tutorialConfig.assetUrl,
            gesture: tutorialConfig.gesture || 'drag',
            duration: tutorialConfig.duration || 1.1,
            loop: true,
            loopDelay: tutorialConfig.loopDelay || 0.4,
            size: tutorialConfig.size || 132
        });
        state.tutorial.setPoints(pair.from, pair.to);
    }

    if (window.MergeMystery) {
        window.MergeMystery.tutorial = state.tutorial;
    }
}

export function scheduleTutorial(state) {
    var tutorialConfig = state.config.tutorial || {};

    clearTutorialDelay(state);

    if (!tutorialConfig.enabled || state.hasUserInteracted || !window.HandTutorial) {
        return;
    }

    state.tutorialDelayId = window.setTimeout(function () {
        state.tutorialDelayId = null;
        ensureTutorial(state);

        if (state.tutorial) {
            state.tutorial.play();
        }
    }, tutorialConfig.startDelayMs || 450);
}

export function dismissTutorial(state) {
    state.hasUserInteracted = true;
    destroyTutorial(state);
}
