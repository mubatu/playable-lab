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

function getPreferredTile(state) {
    var i;

    for (i = 0; i < state.interactableTiles.length; i += 1) {
        if (state.interactableTiles[i].colorId === 'red') {
            return state.interactableTiles[i];
        }
    }

    return state.interactableTiles[0] || null;
}

function getTileScreenPoint(state, tile) {
    if (!tile || !tile.mesh) {
        return null;
    }

    var worldPoint = tile.mesh.getWorldPosition(new window.THREE.Vector3());

    return {
        space: 'world',
        x: worldPoint.x,
        y: worldPoint.y,
        z: worldPoint.z
    };
}

function ensureTutorial(state) {
    var tutorialConfig = state.config.tutorial || {};
    var tile;
    var tapPoint;

    if (!tutorialConfig.enabled || state.hasUserInteracted || !window.HandTutorial || !window.THREE) {
        destroyTutorial(state);
        return;
    }

    tile = getPreferredTile(state);
    tapPoint = getTileScreenPoint(state, tile);

    if (!tapPoint) {
        destroyTutorial(state);
        return;
    }

    if (!state.tutorial) {
        state.tutorial = new window.HandTutorial({
            container: state.renderer.domElement.parentElement,
            renderer: state.renderer,
            camera: state.camera,
            assetUrl: tutorialConfig.assetUrl,
            gesture: tutorialConfig.gesture || 'tap',
            duration: tutorialConfig.duration || 1.05,
            loop: true,
            loopDelay: tutorialConfig.loopDelay || 0.45,
            size: tutorialConfig.size || 120,
            rotation: -8,
            followDirection: false,
            flipX: false,
            showTrail: false,
            anchor: { x: 0.24, y: 0.1 },
            from: tapPoint,
            to: tapPoint
        });
    } else {
        state.tutorial.setPoints(tapPoint, tapPoint);
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
    }, tutorialConfig.startDelayMs || 650);
}

export function dismissTutorial(state) {
    state.hasUserInteracted = true;
    destroyTutorial(state);
}

export function updateTutorial(state) {
    if (state.tutorial) {
        state.tutorial.update(performance.now());
    }
}
