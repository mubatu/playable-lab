import { refreshArrowClickability } from './GridModel.js';
import { startArrowExit } from './ArrowExitSystem.js';
import { GameStateName } from './GameState.js';

function getArrowById(state, arrowId) {
    var i;

    for (i = 0; i < state.arrows.length; i += 1) {
        if (state.arrows[i].id === arrowId) {
            return state.arrows[i];
        }
    }

    return null;
}

function getArrowIdFromObject(object, root) {
    var current = object;

    while (current && current !== root) {
        if (current.userData && current.userData.arrowId) {
            return current.userData.arrowId;
        }

        current = current.parent;
    }

    return null;
}

function setPointerFromEvent(state, event) {
    var rect = state.renderer.domElement.getBoundingClientRect();

    state.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    state.pointer.y = -(((event.clientY - rect.top) / rect.height) * 2 - 1);
}

function findPointerArrow(state, event) {
    var intersections;
    var i;
    var arrowId;

    setPointerFromEvent(state, event);
    state.raycaster.setFromCamera(state.pointer, state.camera);
    intersections = state.raycaster.intersectObjects(state.arrowGroup.children, true);

    for (i = 0; i < intersections.length; i += 1) {
        arrowId = getArrowIdFromObject(intersections[i].object, state.arrowGroup);

        if (arrowId) {
            return getArrowById(state, arrowId);
        }
    }

    return null;
}

function clearFeedbackTimers(arrow) {
    if (!arrow.feedbackTimers) {
        arrow.feedbackTimers = [];
        return;
    }

    arrow.feedbackTimers.forEach(function (timerId) {
        window.clearTimeout(timerId);
    });
    arrow.feedbackTimers = [];
}

function getFeedbackViews(arrow) {
    var views = arrow.meshes.slice();

    if (arrow.headMarker) {
        views.push(arrow.headMarker);
    }

    return views;
}

function resetFeedbackTransforms(arrow) {
    getFeedbackViews(arrow).forEach(function (view) {
        if (!view.userData.feedbackBase) {
            view.userData.feedbackBase = {
                x: view.position.x,
                y: view.position.y,
                scaleX: view.scale.x,
                scaleY: view.scale.y,
                scaleZ: view.scale.z
            };
        }

        view.position.x = view.userData.feedbackBase.x;
        view.position.y = view.userData.feedbackBase.y;
        view.scale.set(
            view.userData.feedbackBase.scaleX,
            view.userData.feedbackBase.scaleY,
            view.userData.feedbackBase.scaleZ
        );
    });
}

function resetFeedbackScales(arrow) {
    getFeedbackViews(arrow).forEach(function (view) {
        if (!view.userData.feedbackBase) {
            view.userData.feedbackBase = {
                x: view.position.x,
                y: view.position.y,
                scaleX: view.scale.x,
                scaleY: view.scale.y,
                scaleZ: view.scale.z
            };
        }

        view.scale.set(
            view.userData.feedbackBase.scaleX,
            view.userData.feedbackBase.scaleY,
            view.userData.feedbackBase.scaleZ
        );
    });
}

function playValidFeedback(arrow) {
    clearFeedbackTimers(arrow);
    resetFeedbackScales(arrow);

    getFeedbackViews(arrow).forEach(function (view) {
        view.scale.multiplyScalar(1.08);
    });

    arrow.feedbackTimers.push(window.setTimeout(function () {
        resetFeedbackScales(arrow);
    }, 110));
}

function playInvalidFeedback(arrow) {
    var amount = 0.08;

    clearFeedbackTimers(arrow);
    resetFeedbackTransforms(arrow);

    getFeedbackViews(arrow).forEach(function (view) {
        view.position.x += amount;
    });

    arrow.feedbackTimers.push(window.setTimeout(function () {
        getFeedbackViews(arrow).forEach(function (view) {
            view.position.x -= amount * 2;
        });
    }, 55));

    arrow.feedbackTimers.push(window.setTimeout(function () {
        resetFeedbackTransforms(arrow);
    }, 120));
}

export function trySelectArrow(state, arrow) {
    if (state.stateName !== GameStateName.PLAYING) {
        return false;
    }

    refreshArrowClickability(state.arrows, state.grid);

    if (!arrow || !arrow.isClickable) {
        if (arrow && !arrow.isExiting) {
            playInvalidFeedback(arrow);
        }
        return false;
    }

    state.selectedArrow = arrow;
    playValidFeedback(arrow);
    startArrowExit(state, arrow);

    if (state.config.debug && state.config.debug.logStateChanges) {
        console.log('Selected clickable arrow:', arrow.id);
    }

    return true;
}

export function bindInteractions(state) {
    var canvas = state.renderer.domElement;

    refreshArrowClickability(state.arrows, state.grid);

    canvas.addEventListener('pointermove', function (event) {
        var arrow = findPointerArrow(state, event);

        if (state.stateName !== GameStateName.PLAYING) {
            canvas.style.cursor = 'default';
            return;
        }

        if (!arrow) {
            canvas.style.cursor = 'pointer';
            return;
        }

        refreshArrowClickability(state.arrows, state.grid);
        canvas.style.cursor = arrow.isClickable ? 'pointer' : 'not-allowed';
    });

    canvas.addEventListener('pointerleave', function () {
        canvas.style.cursor = 'pointer';
    });

    canvas.addEventListener('pointerdown', function (event) {
        var arrow;

        event.preventDefault();

        if (state.stateName !== GameStateName.PLAYING) {
            return;
        }

        arrow = findPointerArrow(state, event);

        if (!arrow) {
            return;
        }

        state.hasUserInteracted = true;
        trySelectArrow(state, arrow);
    });
}
