import { generateShapeSet } from './Shapes.js';
import { createShapeGroup } from './ShapeRenderer.js';

export function refreshSpawnSlots(state) {
    var colors = state.config.shapes.colors;
    var count = state.config.shapes.spawnCount;
    var cellSize = state.boardMetrics.cellSize;
    var gap = state.boardMetrics.gap;
    var spacing = state.config.shapes.spawnSpacing;
    var scale = state.config.shapes.previewScale;
    var shapes = generateShapeSet(count, colors);
    var i;
    var group;
    var xPos;

    for (i = 0; i < state.spawnSlots.length; i += 1) {
        if (state.spawnSlots[i].group) {
            state.sceneManager.removeObject(state.spawnSlots[i].group);
        }
    }

    state.spawnSlots = [];

    for (i = 0; i < count; i += 1) {
        xPos = (i - (count - 1) / 2) * spacing;
        group = createShapeGroup(shapes[i], cellSize, gap, scale);
        group.position.set(xPos, state.config.shapes.spawnOffsetY, state.config.shapes.baseZ);

        state.sceneManager.addObject(group);

        state.spawnSlots.push({
            shape: shapes[i],
            group: group,
            placed: false
        });
    }
}

export function initSpawnSlots(state) {
    refreshSpawnSlots(state);
}
