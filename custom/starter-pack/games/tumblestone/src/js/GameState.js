import * as THREE from 'three';
import { Background } from '../../../../reusables/components/Background.js';
import { SceneManager } from '../../../../reusables/components/SceneManager.js';
import { buildBoard, createGrid } from './Board.js';
import { populateTiles } from './Tiles.js';
import { buildSlots, refreshSlotState } from './Slots.js';
import { refreshProgressDisplay } from './Hud.js';
import { updateInteractables } from './Gameplay.js';
import { scheduleTutorial, destroyTutorial } from './Tutorial.js';

function disposeObject(object) {
    if (!object) {
        return;
    }

    if (object.parent) {
        object.parent.remove(object);
    }

    if (object.geometry) {
        object.geometry.dispose();
    }

    if (object.material) {
        if (Array.isArray(object.material)) {
            object.material.forEach(function (material) {
                material.dispose();
            });
        } else {
            object.material.dispose();
        }
    }
}

function clearTileGrid(state) {
    var row;
    var column;

    for (row = 0; row < state.grid.length; row += 1) {
        for (column = 0; column < state.grid[row].length; column += 1) {
            if (state.grid[row][column]) {
                disposeObject(state.grid[row][column].mesh);
                state.grid[row][column] = null;
            }
        }
    }
}

function clearCollectedSlots(state) {
    var i;

    for (i = 0; i < state.collectedSlots.length; i += 1) {
        if (state.collectedSlots[i]) {
            disposeObject(state.collectedSlots[i].mesh);
            state.collectedSlots[i] = null;
        }
    }
}

function clearOutlines(state) {
    var i;

    for (i = 0; i < state.outlines.length; i += 1) {
        disposeObject(state.outlines[i]);
    }

    state.outlines = [];
}

export function createGameState(config, textures) {
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera();
    var renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    var background = new Background(config.background, textures.background);
    var board = buildBoard(config.board);
    var sceneManager = new SceneManager(scene, renderer);
    var tilesGroup = new THREE.Group();
    var outlinesGroup = new THREE.Group();
    var slotsGroup = new THREE.Group();
    var boardMetrics = board.userData.boardMetrics;

    board.add(tilesGroup);
    board.add(outlinesGroup);

    return {
        config: config,
        scene: scene,
        camera: camera,
        renderer: renderer,
        sceneManager: sceneManager,
        background: background,
        board: board,
        boardMetrics: boardMetrics,
        tilesGroup: tilesGroup,
        outlinesGroup: outlinesGroup,
        slotsGroup: slotsGroup,
        tileTextures: textures.tiles,
        grid: createGrid(config.board.rows, config.board.columns),
        slotPositions: [],
        slotBackgrounds: [],
        collectedSlots: new Array(config.slots.count).fill(null),
        interactableTiles: [],
        outlines: [],
        animations: [],
        raycaster: new THREE.Raycaster(),
        matchesCleared: 0,
        locked: false,
        gameOver: false,
        shakeTime: 0,
        tutorial: null,
        tutorialDelayId: null,
        hasUserInteracted: false,
        clock: new THREE.Clock(),
        animationFrameId: null,
        uiScene: null,
        ui: {},
        onReset: null
    };
}

export function initGameObjects(state) {
    buildSlots(state);
    populateTiles(state);
    updateInteractables(state);
    refreshSlotState(state);
    scheduleTutorial(state);
}

export function resetGame(state) {
    if (state.ui.endOverlay) {
        state.ui.endOverlay.hide();
    }

    clearOutlines(state);
    clearTileGrid(state);
    clearCollectedSlots(state);
    destroyTutorial(state);

    state.animations = [];
    state.interactableTiles = [];
    state.collectedSlots = new Array(state.config.slots.count).fill(null);
    state.grid = createGrid(state.config.board.rows, state.config.board.columns);
    state.matchesCleared = 0;
    state.locked = false;
    state.gameOver = false;
    state.hasUserInteracted = false;
    state.shakeTime = 0;
    state.board.position.x = 0;
    state.board.position.y = state.config.board.offsetY;

    populateTiles(state);
    updateInteractables(state);
    refreshSlotState(state);
    refreshProgressDisplay(state);
    scheduleTutorial(state);
}
