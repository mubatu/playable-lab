import * as THREE from 'three';
import { getShapeBounds } from './Shapes.js';
import { createShapeGroup } from './ShapeRenderer.js';
import { canPlaceShape } from './GridRules.js';
import { updateGhostPreview, hideGhosts } from './GhostPreview.js';
import { tryPlaceDraggedShape } from './Gameplay.js';
import { dismissTutorial } from './Tutorial.js';

var dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function getWorldPoint(event, state) {
    var rect = state.renderer.domElement.getBoundingClientRect();
    var pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    );
    var worldPoint = new THREE.Vector3();

    state.raycaster.setFromCamera(pointer, state.camera);

    if (!state.raycaster.ray.intersectPlane(dragPlane, worldPoint)) {
        return null;
    }

    return worldPoint;
}

function getBoardLocalPoint(worldPoint, state) {
    if (!worldPoint) {
        return null;
    }

    state.board.updateMatrixWorld(true);
    return state.board.worldToLocal(worldPoint.clone());
}

function findAnchorCell(state, localX, localY, cells) {
    var bounds = getShapeBounds(cells);
    var cellSize = state.boardMetrics.cellSize;
    var gap = state.boardMetrics.gap;
    var step = cellSize + gap;
    var startX = state.boardMetrics.startX;
    var startY = state.boardMetrics.startY;
    var centerRowOffset = (bounds.rows - 1) / 2;
    var centerColOffset = (bounds.cols - 1) / 2;
    var continuousCol = (localX - startX) / step;
    var continuousRow = (startY - localY) / step;
    var anchorRow = Math.round(continuousRow - centerRowOffset);
    var anchorCol = Math.round(continuousCol - centerColOffset);

    return { row: anchorRow, col: anchorCol };
}

function findHitSpawnSlot(event, state) {
    var rect = state.renderer.domElement.getBoundingClientRect();
    var pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    );
    var meshes = [];
    var i;
    var slot;
    var intersections;
    var hit;
    var parent;

    state.raycaster.setFromCamera(pointer, state.camera);

    for (i = 0; i < state.spawnSlots.length; i += 1) {
        slot = state.spawnSlots[i];
        if (!slot.placed && slot.group) {
            meshes = meshes.concat(slot.group.children.filter(function (child) {
                return child.isMesh;
            }));
        }
    }

    if (meshes.length === 0) {
        return -1;
    }

    intersections = state.raycaster.intersectObjects(meshes, false);

    if (intersections.length === 0) {
        return -1;
    }

    hit = intersections[0].object;
    parent = hit.parent;

    for (i = 0; i < state.spawnSlots.length; i += 1) {
        if (state.spawnSlots[i].group === parent) {
            return i;
        }
    }

    return -1;
}

function createDragGroup(state, slotIndex) {
    var slot = state.spawnSlots[slotIndex];
    var shape = slot.shape;
    var cellSize = state.boardMetrics.cellSize;
    var gap = state.boardMetrics.gap;
    var group = createShapeGroup(shape, cellSize, gap, 1);

    group.position.z = state.config.shapes.dragZ;
    state.sceneManager.addObject(group);
    return group;
}

function onPointerDown(event, state) {
    var slotIndex;
    var slot;
    var worldPoint;

    if (state.drag || state.gameOver) {
        return;
    }

    dismissTutorial(state);

    slotIndex = findHitSpawnSlot(event, state);

    if (slotIndex < 0) {
        return;
    }

    slot = state.spawnSlots[slotIndex];
    worldPoint = getWorldPoint(event, state);

    if (!worldPoint) {
        return;
    }

    var dragGroup = createDragGroup(state, slotIndex);
    dragGroup.position.set(worldPoint.x, worldPoint.y + state.config.shapes.dragOffsetY, state.config.shapes.dragZ);

    slot.group.visible = false;

    state.drag = {
        slotIndex: slotIndex,
        shape: slot.shape,
        group: dragGroup,
        pointerId: event.pointerId
    };

    if (state.renderer.domElement.setPointerCapture) {
        state.renderer.domElement.setPointerCapture(event.pointerId);
    }

    state.renderer.domElement.style.cursor = 'grabbing';
}

function onPointerMove(event, state) {
    var worldPoint;
    var localPoint;
    var anchor;

    if (!state.drag || event.pointerId !== state.drag.pointerId) {
        return;
    }

    worldPoint = getWorldPoint(event, state);

    if (!worldPoint) {
        return;
    }

    state.drag.group.position.set(
        worldPoint.x,
        worldPoint.y + state.config.shapes.dragOffsetY,
        state.config.shapes.dragZ
    );

    localPoint = getBoardLocalPoint(
        new THREE.Vector3(worldPoint.x, worldPoint.y + state.config.shapes.dragOffsetY, 0),
        state
    );

    if (localPoint) {
        anchor = findAnchorCell(state, localPoint.x, localPoint.y, state.drag.shape.cells);

        if (canPlaceShape(state.grid, state.drag.shape.cells, anchor.row, anchor.col)) {
            updateGhostPreview(state, anchor.row, anchor.col, state.drag.shape.cells);
            state.drag.currentAnchor = anchor;
        } else {
            hideGhosts(state);
            state.drag.currentAnchor = null;
        }
    } else {
        hideGhosts(state);
        state.drag.currentAnchor = null;
    }
}

function finishDrag(event, state) {
    var slot;
    var wasPlaced;

    if (!state.drag || event.pointerId !== state.drag.pointerId) {
        return;
    }

    hideGhosts(state);
    slot = state.spawnSlots[state.drag.slotIndex];

    state.sceneManager.removeObject(state.drag.group);
    wasPlaced = tryPlaceDraggedShape(state, state.drag);

    if (!wasPlaced) {
        slot.group.visible = true;
    }

    if (state.renderer.domElement.releasePointerCapture && state.renderer.domElement.hasPointerCapture && state.renderer.domElement.hasPointerCapture(event.pointerId)) {
        state.renderer.domElement.releasePointerCapture(event.pointerId);
    }

    state.drag = null;
    state.renderer.domElement.style.cursor = 'grab';
}

export function bindInteractions(state) {
    var canvas = state.renderer.domElement;

    canvas.addEventListener('pointerdown', function (event) {
        onPointerDown(event, state);
    });
    canvas.addEventListener('pointermove', function (event) {
        onPointerMove(event, state);
    });
    canvas.addEventListener('pointerup', function (event) {
        finishDrag(event, state);
    });
    canvas.addEventListener('pointercancel', function (event) {
        finishDrag(event, state);
    });
    window.addEventListener('pointerup', function (event) {
        finishDrag(event, state);
    });
    window.addEventListener('pointercancel', function (event) {
        finishDrag(event, state);
    });
}
