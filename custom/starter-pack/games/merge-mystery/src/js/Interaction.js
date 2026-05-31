import * as THREE from 'three';
import { getCellCenter } from './Board.js';
import { resolvePieceDrop } from './MergeRules.js';
import { dismissTutorial } from './Tutorial.js';

var dragPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

function setCanvasCursor(state, cursor) {
    if (state && state.renderer && state.renderer.domElement) {
        state.renderer.domElement.style.cursor = cursor;
    }
}

function getWorldPointOnBoard(event, state) {
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

function getBoardLocalPoint(event, state) {
    var worldPoint = getWorldPointOnBoard(event, state);

    if (!worldPoint) {
        return null;
    }

    state.board.updateMatrixWorld(true);
    return state.board.worldToLocal(worldPoint.clone());
}

function findClosestCell(state, localX, localY) {
    var closestCell = null;
    var closestDistance = Infinity;
    var row;
    var column;

    for (row = 0; row < state.boardMetrics.rows; row += 1) {
        for (column = 0; column < state.boardMetrics.columns; column += 1) {
            var center = getCellCenter(state.boardMetrics, row, column);
            var deltaX = localX - center.x;
            var deltaY = localY - center.y;
            var distance = Math.sqrt((deltaX * deltaX) + (deltaY * deltaY));

            if (distance < closestDistance) {
                closestDistance = distance;
                closestCell = {
                    row: row,
                    column: column
                };
            }
        }
    }

    if (closestDistance > state.boardMetrics.dropRadius) {
        return null;
    }

    return closestCell;
}

function setPointerCapture(canvas, pointerId) {
    if (canvas.setPointerCapture) {
        canvas.setPointerCapture(pointerId);
    }
}

function releasePointerCapture(canvas, pointerId) {
    if (canvas.hasPointerCapture && canvas.hasPointerCapture(pointerId) && canvas.releasePointerCapture) {
        canvas.releasePointerCapture(pointerId);
    }
}

function onPointerDown(event, state) {
    var rect;
    var pointer;
    var intersections;
    var piece;
    var localPoint;

    if (state.drag) {
        return;
    }

    dismissTutorial(state);

    rect = state.renderer.domElement.getBoundingClientRect();
    pointer = new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    );

    state.raycaster.setFromCamera(pointer, state.camera);
    intersections = state.raycaster.intersectObjects(state.piecesGroup.children, false);

    if (!intersections.length) {
        return;
    }

    piece = intersections[0].object;
    localPoint = getBoardLocalPoint(event, state);

    if (!piece.userData.isPiece || !localPoint) {
        return;
    }

    state.drag = {
        piece: piece,
        sourceRow: piece.userData.row,
        sourceColumn: piece.userData.column,
        offsetX: localPoint.x - piece.position.x,
        offsetY: localPoint.y - piece.position.y,
        pointerId: event.pointerId
    };

    piece.position.z = state.config.pieces.dragZ;
    piece.scale.setScalar(state.config.pieces.dragScale);
    setPointerCapture(state.renderer.domElement, event.pointerId);
    setCanvasCursor(state, 'grabbing');
}

function onPointerMove(event, state) {
    var localPoint;

    if (!state.drag || event.pointerId !== state.drag.pointerId) {
        return;
    }

    localPoint = getBoardLocalPoint(event, state);

    if (!localPoint) {
        return;
    }

    state.drag.piece.position.set(
        localPoint.x - state.drag.offsetX,
        localPoint.y - state.drag.offsetY,
        state.config.pieces.dragZ
    );
}

function finishDrag(event, state) {
    var draggedPiece;
    var closestCell;
    var sourceRow;
    var sourceColumn;

    if (!state.drag || event.pointerId !== state.drag.pointerId) {
        return;
    }

    draggedPiece = state.drag.piece;
    sourceRow = state.drag.sourceRow;
    sourceColumn = state.drag.sourceColumn;
    closestCell = findClosestCell(state, draggedPiece.position.x, draggedPiece.position.y);
    resolvePieceDrop(state, draggedPiece, closestCell, sourceRow, sourceColumn);

    releasePointerCapture(state.renderer.domElement, event.pointerId);
    state.drag = null;
    setCanvasCursor(state, 'grab');
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
