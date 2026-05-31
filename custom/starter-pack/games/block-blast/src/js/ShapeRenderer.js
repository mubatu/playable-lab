import * as THREE from 'three';
import { createRoundedRectTexture } from '../../../../reusables/components/VisualUtils.js';
import { getShapeBounds } from './Shapes.js';

var sharedBlockTexture = null;

export function getBlockTexture() {
    if (!sharedBlockTexture) {
        sharedBlockTexture = createRoundedRectTexture(64, 10);
    }
    return sharedBlockTexture;
}

export function createBlockMesh(size, color, z) {
    var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
            map: getBlockTexture(),
            color: new THREE.Color(color),
            transparent: true
        })
    );

    mesh.position.z = z;
    return mesh;
}

export function createShapeGroup(shape, cellSize, gap, scale) {
    var group = new THREE.Group();
    var bounds = getShapeBounds(shape.cells);
    var step = cellSize + gap;
    var visualSize = cellSize * 0.92;
    var geometry = new THREE.PlaneGeometry(visualSize, visualSize);
    var material = new THREE.MeshBasicMaterial({
        map: getBlockTexture(),
        color: new THREE.Color(shape.color),
        transparent: true
    });
    var centerX = (bounds.cols - 1) * step * 0.5;
    var centerY = (bounds.rows - 1) * step * 0.5;
    var i;
    var row;
    var col;

    for (i = 0; i < shape.cells.length; i += 1) {
        row = shape.cells[i][0];
        col = shape.cells[i][1];
        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(
            col * step - centerX,
            -(row * step - centerY),
            0.1
        );
        mesh.userData.shapeCell = true;
        group.add(mesh);
    }

    group.userData.shape = shape;
    group.userData.bounds = bounds;

    if (typeof scale === 'number') {
        group.scale.setScalar(scale);
    }

    return group;
}
