import * as THREE from 'three';
import { getBoardCenter, getInnerCoord } from './Board.js';
import { ArrowCell3D } from './ArrowCell3D.js';
import { Shooter3D } from './Shooter3D.js';

function createArrowMarker(size, direction, color) {
    var shape = new THREE.Shape();
    var marker;

    shape.moveTo(0, size * 0.32);
    shape.lineTo(size * 0.3, -size * 0.24);
    shape.lineTo(size * 0.1, -size * 0.18);
    shape.lineTo(size * 0.1, -size * 0.38);
    shape.lineTo(-size * 0.1, -size * 0.38);
    shape.lineTo(-size * 0.1, -size * 0.18);
    shape.lineTo(-size * 0.3, -size * 0.24);
    shape.lineTo(0, size * 0.32);

    marker = new THREE.Mesh(
        new THREE.ShapeGeometry(shape),
        new THREE.MeshBasicMaterial({
            color: new THREE.Color(color),
            side: THREE.DoubleSide,
            depthTest: false,
            depthWrite: false
        })
    );

    if (direction === 'right') {
        marker.rotation.z = -Math.PI * 0.5;
    } else if (direction === 'down') {
        marker.rotation.z = Math.PI;
    } else if (direction === 'left') {
        marker.rotation.z = Math.PI * 0.5;
    }

    marker.renderOrder = 12;
    return marker;
}

function getShooterOffset(metrics, side, config) {
    var distance = metrics.cellSize * (config.shooter.distanceFromFrameCells || 1.12);

    if (side === 'top') {
        return { x: 0, y: distance };
    }
    if (side === 'right') {
        return { x: distance, y: 0 };
    }
    if (side === 'bottom') {
        return { x: 0, y: -distance };
    }
    return { x: -distance, y: 0 };
}

function getShooterRotation(side) {
    if (side === 'right') {
        return -Math.PI * 0.5;
    }
    if (side === 'bottom') {
        return Math.PI;
    }
    if (side === 'left') {
        return Math.PI * 0.5;
    }
    return 0;
}

function getDarkColor(color) {
    return new THREE.Color(color).multiplyScalar(0.58);
}

function tagArrowView(view, arrow, cell, boardCoord) {
    view.userData.arrowId = arrow.id;
    view.userData.gridCoord = { row: cell.row, col: cell.col };
    view.userData.boardCoord = boardCoord;
    view.traverse(function (child) {
        child.userData.arrowId = arrow.id;
        child.userData.gridCoord = { row: cell.row, col: cell.col };
        child.userData.boardCoord = boardCoord;
    });
}

export function renderArrows(board, metrics, arrows, config) {
    var arrowGroup = new THREE.Group();
    var visualSize = metrics.cellSize * metrics.arrowScale;
    var arrowById = {};

    arrows.forEach(function (arrow) {
        var markerColor = arrow.color === 'yellow' ? '#7d6200' : '#ffffff';

        arrow.cells.forEach(function (cell) {
            var boardCoord = getInnerCoord(cell);
            var center = getBoardCenter(metrics, boardCoord.row, boardCoord.col);
            var mesh = new ArrowCell3D({
                size: visualSize,
                depth: metrics.cellHeight,
                color: config.colors[arrow.color]
            });

            mesh.position.set(center.x, center.y, metrics.cellHeight * 0.08);
            tagArrowView(mesh, arrow, cell, boardCoord);
            arrow.meshes.push(mesh);
            arrowGroup.add(mesh);
        });

        var headBoardCoord = getInnerCoord(arrow.head);
        var headCenter = getBoardCenter(metrics, headBoardCoord.row, headBoardCoord.col);
        var marker = createArrowMarker(visualSize * 0.62, arrow.direction, markerColor);

        marker.position.x = headCenter.x;
        marker.position.y = headCenter.y;
        marker.position.z = (metrics.cellHeight * 1.34) + 0.08;
        marker.userData.arrowId = arrow.id;
        arrow.headMarker = marker;
        arrowGroup.add(marker);
        arrowById[arrow.id] = arrow;
    });

    arrowGroup.userData.arrowById = arrowById;
    board.add(arrowGroup);

    return arrowGroup;
}

export function renderShooters(board, metrics, shooters, config) {
    var shooterGroup = new THREE.Group();
    var bodySize = metrics.cellSize * 0.78;

    shooters.forEach(function (shooter) {
        var center = getBoardCenter(metrics, shooter.directCoord.row, shooter.directCoord.col);
        var offset = getShooterOffset(metrics, shooter.side, config);
        var color = shooter.isBlocked ? config.colors.shooterInactive : config.colors[shooter.color];
        var group = new Shooter3D({
            number: shooter.shots,
            color: color,
            darkColor: getDarkColor(color),
            width: bodySize,
            height: bodySize,
            depth: metrics.cellHeight * 1.45
        });

        group.position.set(center.x + offset.x, center.y + offset.y, metrics.cellHeight * 0.12);
        group.rotation.z = getShooterRotation(shooter.side);
        group.userData.shooterId = shooter.id;
        shooter.view = group;
        shooterGroup.add(group);
    });

    board.add(shooterGroup);
    return shooterGroup;
}
