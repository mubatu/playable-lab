import * as THREE from 'three';
import { Background } from '../../../../reusables/components/Background.js';
import { SceneManager } from '../../../../reusables/components/SceneManager.js';
import { buildBoard, createGrid } from './Board.js';
import { createPieceMaterials, populateInitialPieces, clearBoardPieces } from './Pieces.js';
import { createParticlePool, clearParticles } from './ParticleFX.js';
import { refreshHud } from './Hud.js';
import { scheduleTutorial, destroyTutorial } from './Tutorial.js';

export function createGameState(config, assets) {
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera();
    var renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    var background = new Background(config.background, assets.backgroundTexture);
    var board = buildBoard(config.board);
    var boardMetrics = board.userData.boardMetrics;
    var sceneManager = new SceneManager(scene, renderer);
    var piecesGroup = new THREE.Group();
    var pieceGeometry = new THREE.PlaneGeometry(
        boardMetrics.cellSize * config.pieces.scale,
        boardMetrics.cellSize * config.pieces.scale
    );

    board.add(piecesGroup);

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
        pieceGeometry: pieceGeometry,
        pieceMaterials: createPieceMaterials(assets.pieceTextures),
        grid: createGrid(config.board.rows, config.board.columns),
        raycaster: new THREE.Raycaster(),
        drag: null,
        maxTier: config.pieces.texturePaths.length,
        highestTier: config.pieces.initialTier || 1,
        fxEnabled: true,
        particlePool: createParticlePool(),
        activeParticles: new Set(),
        uiScene: null,
        ui: {},
        tutorial: null,
        tutorialDelayId: null,
        hasUserInteracted: false,
        clock: new THREE.Clock(),
        animationFrameId: null
    };
}

export function resetBoard(state) {
    state.drag = null;
    state.hasUserInteracted = false;
    state.renderer.domElement.style.cursor = 'grab';
    clearParticles(state);
    destroyTutorial(state);
    clearBoardPieces(state);
    populateInitialPieces(state);
    refreshHud(state);
    scheduleTutorial(state);
}
