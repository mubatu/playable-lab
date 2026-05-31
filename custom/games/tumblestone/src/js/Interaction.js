import * as THREE from 'three';
import { collectTile } from './Gameplay.js';
import { dismissTutorial } from './Tutorial.js';

function getPointer(event, state) {
    var rect = state.renderer.domElement.getBoundingClientRect();

    return new THREE.Vector2(
        ((event.clientX - rect.left) / rect.width) * 2 - 1,
        -(((event.clientY - rect.top) / rect.height) * 2 - 1)
    );
}

function findHitTile(event, state) {
    var pointer = getPointer(event, state);
    var meshes = state.interactableTiles.map(function (tile) {
        return tile.mesh;
    });
    var intersections;

    if (meshes.length === 0) {
        return null;
    }

    state.raycaster.setFromCamera(pointer, state.camera);
    intersections = state.raycaster.intersectObjects(meshes, false);

    if (intersections.length === 0) {
        return null;
    }

    return intersections[0].object.userData.tile;
}

export function bindInteractions(state) {
    var canvas = state.renderer.domElement;

    canvas.addEventListener('pointerdown', function (event) {
        var tile = findHitTile(event, state);

        if (tile) {
            event.preventDefault();
            dismissTutorial(state);
            collectTile(state, tile);
        }
    });
}
