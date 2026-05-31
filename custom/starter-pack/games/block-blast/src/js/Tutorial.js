function clearTutorialDelay(state) {
    if (state.tutorialDelayId) {
        window.clearTimeout(state.tutorialDelayId);
        state.tutorialDelayId = null;
    }
}

export function destroyTutorial(state) {
    clearTutorialDelay(state);

    if (state.tutorial) {
        state.tutorial.destroy();
        state.tutorial = null;
    }
}

function getSpawnSlotScreenPoint(state, slotIndex) {
    if (!state.spawnSlots || !state.spawnSlots[slotIndex] || !state.spawnSlots[slotIndex].group) {
        return null;
    }

    var group = state.spawnSlots[slotIndex].group;
    var worldPos = group.position.clone();

    return {
        space: 'world',
        x: worldPos.x,
        y: worldPos.y,
        z: worldPos.z
    };
}

function getBoardCenterScreenPoint(state) {
    var boardMetrics = state.boardMetrics;
    var centerRow = Math.floor(boardMetrics.rows / 2);
    var centerCol = Math.floor(boardMetrics.columns / 2);
    var cellCenter = boardMetrics.cellCenters[centerRow][centerCol];
    var localPoint = new window.THREE.Vector3(cellCenter.x, cellCenter.y, 0.2);

    state.board.updateMatrixWorld(true);
    var worldPoint = state.board.localToWorld(localPoint);

    return {
        space: 'world',
        x: worldPoint.x,
        y: worldPoint.y,
        z: worldPoint.z
    };
}

function ensureTutorial(state) {
    var tutorialConfig = state.config.tutorial || {};
    var fromPoint;
    var toPoint;

    if (!tutorialConfig.enabled || state.hasUserInteracted || !window.HandTutorial) {
        destroyTutorial(state);
        return;
    }

    fromPoint = getSpawnSlotScreenPoint(state, 0);
    toPoint = getBoardCenterScreenPoint(state);

    if (!fromPoint || !toPoint) {
        destroyTutorial(state);
        return;
    }

    if (!state.tutorial) {
        state.tutorial = new window.HandTutorial({
            container: state.renderer.domElement.parentElement,
            renderer: state.renderer,
            camera: state.camera,
            assetUrl: tutorialConfig.assetUrl,
            gesture: tutorialConfig.gesture || 'drag',
            duration: tutorialConfig.duration || 1.2,
            loop: true,
            loopDelay: tutorialConfig.loopDelay || 0.5,
            size: tutorialConfig.size || 120,
            rotation: 0,
            followDirection: false,
            flipX: false,
            showTrail: true,
            anchor: { x: 0.22, y: 0.08 },
            from: fromPoint,
            to: toPoint
        });
    } else {
        state.tutorial.setPoints(fromPoint, toPoint);
    }
}

export function scheduleTutorial(state) {
    var tutorialConfig = state.config.tutorial || {};

    clearTutorialDelay(state);

    if (!tutorialConfig.enabled || state.hasUserInteracted || !window.HandTutorial) {
        return;
    }

    state.tutorialDelayId = window.setTimeout(function () {
        state.tutorialDelayId = null;
        ensureTutorial(state);

        if (state.tutorial) {
            state.tutorial.play();
        }
    }, tutorialConfig.startDelayMs || 1000);
}

export function dismissTutorial(state) {
    state.hasUserInteracted = true;
    destroyTutorial(state);
}
