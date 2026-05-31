import * as THREE from 'three';
import { Background } from '../../../../reusables/components/Background.js';
import { SceneManager } from '../../../../reusables/components/SceneManager.js';
import { createGradientTexture } from '../../../../reusables/components/VisualUtils.js';
import { buildBoard, createGrid } from './Board.js';
import { createGhostGroup } from './GhostPreview.js';
import { createParticlePool, clearParticles } from './ParticleFX.js';
import { initSpawnSlots } from './SpawnSlots.js';
import { refreshScoreDisplay } from './Hud.js';
import { scheduleTutorial, destroyTutorial } from './Tutorial.js';

export function createGameState(config) {
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera();
    var renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    var bgTexture = createGradientTexture(
        config.background.gradientTop || '#1a0533',
        config.background.gradientBottom || '#0d1b2a',
        4,
        8
    );
    var background = new Background(config.background, bgTexture);
    var board = buildBoard(config.board);
    var boardMetrics = board.userData.boardMetrics;
    var sceneManager = new SceneManager(scene, renderer);
    var piecesGroup = new THREE.Group();
    var ghostGroup = createGhostGroup(boardMetrics);

    board.add(piecesGroup);
    board.add(ghostGroup);

    return {
        config: config,
        scene: scene,
        camera: camera,
        renderer: renderer,
        sceneManager: sceneManager,
        board: board,
        boardMetrics: boardMetrics,
        background: background,
        piecesGroup: piecesGroup,
        ghostGroup: ghostGroup,
        grid: createGrid(config.board.rows, config.board.columns),
        spawnSlots: [],
        raycaster: new THREE.Raycaster(),
        drag: null,
        score: 0,
        gameOver: false,
        fxEnabled: true,
        particlePool: createParticlePool(),
        activeParticles: new Set(),
        shakeTime: 0,
        uiScene: null,
        ui: {},
        tutorial: null,
        tutorialDelayId: null,
        hasUserInteracted: false,
        clock: new THREE.Clock(),
        animationFrameId: null,
        onReset: null
    };
}

export function resetGame(state) {
    var i;
    var row;
    var col;
    var mesh;
    if (state.ui.gameOverOverlay) {
        state.ui.gameOverOverlay.hide();
    }

    state.gameOver = false;
    state.score = 0;
    state.drag = null;
    state.hasUserInteracted = false;
    state.shakeTime = 0;
    state.board.position.x = 0;
    state.board.position.y = state.config.board.offsetY;
    state.renderer.domElement.style.cursor = 'grab';

    clearParticles(state);
    destroyTutorial(state);

    for (row = 0; row < state.grid.length; row += 1) {
        for (col = 0; col < state.grid[row].length; col += 1) {
            mesh = state.grid[row][col];
            if (mesh) {
                state.piecesGroup.remove(mesh);
                mesh.geometry.dispose();
                mesh.material.dispose();
                state.grid[row][col] = null;
            }
        }
    }

    for (i = 0; i < state.spawnSlots.length; i += 1) {
        if (state.spawnSlots[i].group) {
            state.sceneManager.removeObject(state.spawnSlots[i].group);
        }
    }
    state.spawnSlots = [];

    refreshScoreDisplay(state);
    initSpawnSlots(state);
    scheduleTutorial(state);
}
