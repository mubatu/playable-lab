import * as THREE from 'three';
import { getCellCenter } from './Board.js';
import { canPlaceShape } from './GridRules.js';
import { getBlockTexture } from './ShapeRenderer.js';

export function createGhostGroup(boardMetrics) {
    var group = new THREE.Group();
    var maxCells = 9;
    var cellSize = boardMetrics.cellSize;
    var visualSize = cellSize * 0.92;
    var geometry = new THREE.PlaneGeometry(visualSize, visualSize);
    var material = new THREE.MeshBasicMaterial({
        map: getBlockTexture(),
        color: 0xffffff,
        transparent: true,
        opacity: 0.22,
        depthWrite: false
    });
    var i;

    group.userData.ghosts = [];

    for (i = 0; i < maxCells; i += 1) {
        var ghost = new THREE.Mesh(geometry, material);
        ghost.visible = false;
        ghost.position.z = 0.15;
        group.add(ghost);
        group.userData.ghosts.push(ghost);
    }

    return group;
}

export function updateGhostPreview(state, anchorRow, anchorCol, cells) {
    var ghosts = state.ghostGroup.userData.ghosts;
    var i;

    for (i = 0; i < ghosts.length; i += 1) {
        ghosts[i].visible = false;
    }

    if (anchorRow === null || anchorCol === null || !cells) {
        return;
    }

    if (!canPlaceShape(state.grid, cells, anchorRow, anchorCol)) {
        return;
    }

    for (i = 0; i < cells.length && i < ghosts.length; i += 1) {
        var cellRow = anchorRow + cells[i][0];
        var cellCol = anchorCol + cells[i][1];
        var center = getCellCenter(state.boardMetrics, cellRow, cellCol);

        ghosts[i].position.set(center.x, center.y, 0.15);
        ghosts[i].visible = true;
    }
}

export function hideGhosts(state) {
    var ghosts = state.ghostGroup.userData.ghosts;
    var i;

    for (i = 0; i < ghosts.length; i += 1) {
        ghosts[i].visible = false;
    }
}
