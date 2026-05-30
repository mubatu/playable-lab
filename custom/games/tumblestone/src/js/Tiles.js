import * as THREE from 'three';
import { TextureUtils } from '../../../../reusables/components/TextureUtils.js';
import { getCellCenter, getOutlineTexture } from './Board.js';

export function loadTileTextures(tileConfig) {
    var textureMap = {};
    var paths = tileConfig.colors.map(function (entry) {
        return entry.texture;
    });

    return TextureUtils.loadAll(paths).then(function (textures) {
        var i;

        for (i = 0; i < tileConfig.colors.length; i += 1) {
            textureMap[tileConfig.colors[i].id] = textures[i];
        }

        return textureMap;
    });
}

export function createTileMesh(colorId, texture, size, z) {
    var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size, size),
        new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true
        })
    );

    mesh.position.z = z;
    mesh.userData.colorId = colorId;
    mesh.userData.isTile = true;
    return mesh;
}

export function createOutlineMesh(size, z) {
    var mesh = new THREE.Mesh(
        new THREE.PlaneGeometry(size * 1.1, size * 1.1),
        new THREE.MeshBasicMaterial({
            map: getOutlineTexture(),
            transparent: true,
            depthWrite: false
        })
    );

    mesh.position.z = z;
    mesh.userData.isOutline = true;
    return mesh;
}

export function populateTiles(state) {
    var rows = state.config.board.rows;
    var columns = state.config.board.columns;
    var colorIds = state.config.tiles.colors.map(function (entry) {
        return entry.id;
    });
    var playableStacks = [
        ['red', 'green', 'yellow', 'purple', 'red', 'green', 'yellow', 'purple', 'red', 'green', 'yellow', 'purple'],
        ['red', 'green', 'yellow', 'purple', 'red', 'yellow', 'purple', 'red', 'green', 'yellow', 'purple', 'red'],
        ['red', 'green', 'yellow', 'purple', 'red', 'purple', 'red', 'green', 'yellow', 'purple', 'red', 'green'],
        ['green', 'yellow', 'purple', 'red', 'green', 'yellow', 'purple', 'red', 'green', 'yellow', 'purple', 'red'],
        ['yellow', 'purple', 'red', 'green', 'yellow', 'purple', 'red', 'green', 'yellow', 'purple', 'red', 'green']
    ];
    var tileSize = state.boardMetrics.cellSize * 0.94;
    var row;
    var column;

    for (row = 0; row < rows; row += 1) {
        for (column = 0; column < columns; column += 1) {
            var stack = playableStacks[column] || playableStacks[column % playableStacks.length];
            var colorId = stack[rows - 1 - row] || colorIds[(row + column) % colorIds.length];
            var mesh = createTileMesh(colorId, state.tileTextures[colorId], tileSize, state.config.tiles.baseZ);
            var center = getCellCenter(state.boardMetrics, row, column);
            var tile = {
                row: row,
                column: column,
                colorId: colorId,
                mesh: mesh
            };

            mesh.position.set(center.x, center.y, state.config.tiles.baseZ);
            mesh.userData.tile = tile;
            state.grid[row][column] = tile;
            state.tilesGroup.add(mesh);
        }
    }
}
