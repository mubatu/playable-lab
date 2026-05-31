import * as THREE from 'three';
import { findLowestTileInColumn, getCellWorldPosition } from './Board.js';
import { createOutlineMesh } from './Tiles.js';
import { refreshSlotState } from './Slots.js';
import { refreshProgressDisplay, showEndState } from './Hud.js';

function easeOutCubic(value) {
    return 1 - Math.pow(1 - value, 3);
}

function firstEmptySlot(state) {
    var i;

    for (i = 0; i < state.collectedSlots.length; i += 1) {
        if (!state.collectedSlots[i]) {
            return i;
        }
    }

    return -1;
}

function currentSlotColor(state) {
    var i;

    for (i = 0; i < state.collectedSlots.length; i += 1) {
        if (state.collectedSlots[i]) {
            return state.collectedSlots[i].colorId;
        }
    }

    return null;
}

function animate(state, options) {
    state.animations.push({
        mesh: options.mesh,
        from: options.from.clone(),
        to: options.to.clone(),
        fromScale: typeof options.fromScale === 'number' ? options.fromScale : options.mesh.scale.x,
        toScale: typeof options.toScale === 'number' ? options.toScale : options.mesh.scale.x,
        duration: Math.max(options.duration, 0.01),
        elapsed: 0,
        onComplete: options.onComplete || null
    });
}

function removeOutlineMeshes(state) {
    var i;

    for (i = 0; i < state.outlines.length; i += 1) {
        if (state.outlines[i].parent) {
            state.outlines[i].parent.remove(state.outlines[i]);
        }
        state.outlines[i].geometry.dispose();
        state.outlines[i].material.dispose();
    }

    state.outlines = [];
}

function clearCollectedSet(state) {
    var remaining = 0;
    var i;

    state.locked = true;

    function finishOne(mesh) {
        if (mesh.parent) {
            mesh.parent.remove(mesh);
        }
        mesh.geometry.dispose();
        mesh.material.dispose();
        remaining -= 1;

        if (remaining === 0) {
            state.collectedSlots = new Array(state.config.slots.count).fill(null);
            state.matchesCleared += 1;
            refreshSlotState(state);
            refreshProgressDisplay(state);

            if (state.matchesCleared >= state.config.progression.requiredMatches) {
                showEndState(state, true);
                return;
            }

            updateInteractables(state);
            state.locked = false;
        }
    }

    for (i = 0; i < state.collectedSlots.length; i += 1) {
        if (state.collectedSlots[i]) {
            remaining += 1;
            animate(state, {
                mesh: state.collectedSlots[i].mesh,
                from: state.collectedSlots[i].mesh.position,
                to: state.collectedSlots[i].mesh.position,
                fromScale: state.collectedSlots[i].mesh.scale.x,
                toScale: 0.18,
                duration: state.config.animation.clearDuration,
                onComplete: finishOne
            });
        }
    }
}

export function updateInteractables(state) {
    var column;

    removeOutlineMeshes(state);
    state.interactableTiles = [];

    for (column = 0; column < state.config.board.columns; column += 1) {
        var tile = findLowestTileInColumn(state.grid, column);

        if (tile) {
            var outline = createOutlineMesh(state.boardMetrics.cellSize, state.config.tiles.outlineZ);

            tile.mesh.userData.interactable = true;
            outline.position.copy(tile.mesh.position);
            state.outlinesGroup.add(outline);
            state.outlines.push(outline);
            state.interactableTiles.push(tile);
        }
    }
}

export function collectTile(state, tile) {
    var slotIndex;
    var expectedColor;
    var fromWorld;
    var toWorld;

    if (state.locked || state.gameOver || !tile || !tile.mesh.userData.interactable) {
        return;
    }

    expectedColor = currentSlotColor(state);

    if (expectedColor && expectedColor !== tile.colorId) {
        state.shakeTime = state.config.animation.failShakeSeconds;
        showEndState(state, false);
        return;
    }

    slotIndex = firstEmptySlot(state);

    if (slotIndex < 0) {
        return;
    }

    state.locked = true;
    state.grid[tile.row][tile.column] = null;
    fromWorld = getCellWorldPosition(state.board, state.boardMetrics, tile.row, tile.column, state.config.tiles.collectedZ);
    toWorld = state.slotPositions[slotIndex].clone();

    if (tile.mesh.parent) {
        tile.mesh.parent.remove(tile.mesh);
    }
    tile.mesh.position.copy(fromWorld);
    tile.mesh.scale.setScalar(1);
    tile.mesh.position.z = state.config.tiles.collectedZ;
    state.scene.add(tile.mesh);

    state.collectedSlots[slotIndex] = {
        colorId: tile.colorId,
        mesh: tile.mesh
    };

    updateInteractables(state);
    refreshSlotState(state);

    animate(state, {
        mesh: tile.mesh,
        from: fromWorld,
        to: toWorld,
        fromScale: 1,
        toScale: state.config.slots.sizeScale / 0.94,
        duration: state.config.animation.collectDuration,
        onComplete: function () {
            if (state.collectedSlots.every(Boolean)) {
                clearCollectedSet(state);
                return;
            }

            updateInteractables(state);
            state.locked = false;
        }
    });
}

export function updateAnimations(state, delta) {
    var i;

    for (i = state.animations.length - 1; i >= 0; i -= 1) {
        var animation = state.animations[i];
        var progress;
        var eased;
        var scale;

        animation.elapsed += delta;
        progress = Math.min(animation.elapsed / animation.duration, 1);
        eased = easeOutCubic(progress);
        animation.mesh.position.lerpVectors(animation.from, animation.to, eased);
        scale = animation.fromScale + ((animation.toScale - animation.fromScale) * eased);
        animation.mesh.scale.setScalar(scale);

        if (progress >= 1) {
            state.animations.splice(i, 1);

            if (animation.onComplete) {
                animation.onComplete(animation.mesh);
            }
        }
    }
}
