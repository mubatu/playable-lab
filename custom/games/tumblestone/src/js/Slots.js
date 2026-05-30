import * as THREE from 'three';
import { createRoundedRectTexture } from '../../../../reusables/components/VisualUtils.js';

export function buildSlots(state) {
    var config = state.config.slots;
    var slotSize = state.boardMetrics.cellSize * config.sizeScale;
    var totalWidth = ((config.count - 1) * config.spacing);
    var slotTexture = createRoundedRectTexture(96, 18);
    var slotGeometry = new THREE.PlaneGeometry(slotSize, slotSize);
    var slotMaterial = new THREE.MeshBasicMaterial({
        map: slotTexture,
        color: new THREE.Color(config.emptyColor),
        transparent: true,
        opacity: 0.86
    });
    var i;

    state.slotsGroup.clear();
    state.slotBackgrounds = [];
    state.slotPositions = [];

    for (i = 0; i < config.count; i += 1) {
        var x = (i * config.spacing) - (totalWidth * 0.5);
        var slot = new THREE.Mesh(slotGeometry, slotMaterial.clone());

        slot.position.set(x, config.offsetY, 0.08);
        state.slotsGroup.add(slot);
        state.slotBackgrounds.push(slot);
        state.slotPositions.push(new THREE.Vector3(x, config.offsetY, state.config.tiles.collectedZ));
    }
}

export function refreshSlotState(state) {
    var i;

    for (i = 0; i < state.slotBackgrounds.length; i += 1) {
        state.slotBackgrounds[i].material.color.set(
            state.collectedSlots[i] ? state.config.slots.activeColor : state.config.slots.emptyColor
        );
    }
}
