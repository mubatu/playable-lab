import * as THREE from 'three';
import { Background } from '../../../../reusables/components/Background.js';
import { SceneManager } from '../../../../reusables/components/SceneManager.js';
import { createGradientTexture } from '../../../../reusables/components/VisualUtils.js';
import { buildBoard } from './Board.js';
import { createArrowModels } from './ArrowModel.js';
import { createGridModel } from './GridModel.js';
import { createFramePath } from './FramePath.js';
import { renderArrows, renderShooters } from './Visuals.js';

export const GameStateName = {
    READY: 'ready',
    PLAYING: 'playing',
    WIN: 'win',
    LOSE: 'lose'
};

function createLights(scene) {
    var ambient = new THREE.AmbientLight(0xffffff, 1.5);
    var key = new THREE.DirectionalLight(0xffffff, 2.2);

    key.position.set(3, 6, 8);
    scene.add(ambient);
    scene.add(key);
}

function countArrowCells(arrows) {
    return arrows.reduce(function (total, arrow) {
        return total + arrow.cells.length;
    }, 0);
}

export function createGameState(config, level) {
    var scene = new THREE.Scene();
    var camera = new THREE.OrthographicCamera();
    var renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    var bgTexture = createGradientTexture(
        config.background.gradientTop,
        config.background.gradientBottom,
        4,
        8
    );
    var background = new Background(config.background, bgTexture);
    var sceneManager = new SceneManager(scene, renderer);
    var board = buildBoard(config, level);
    var metrics = board.userData.boardMetrics;
    var arrows = createArrowModels(level);
    var totalCells = countArrowCells(arrows);
    var grid = createGridModel(level, arrows);
    var framePath = createFramePath(metrics);
    var arrowGroup;
    var shooterGroup;

    createLights(scene);
    arrowGroup = renderArrows(board, metrics, arrows, config);
    shooterGroup = renderShooters(board, metrics, level.shooters, config);

    return {
        config: config,
        level: level,
        stateName: GameStateName.READY,
        scene: scene,
        camera: camera,
        renderer: renderer,
        sceneManager: sceneManager,
        background: background,
        board: board,
        boardMetrics: metrics,
        arrows: arrows,
        grid: grid,
        framePath: framePath,
        arrowGroup: arrowGroup,
        shooterGroup: shooterGroup,
        shooters: level.shooters,
        totalCells: totalCells,
        remainingCells: totalCells,
        sessionSeconds: 0,
        terminalReason: null,
        exitingArrows: [],
        movingCells: [],
        frameTickAccumulator: 0,
        activeFrameMoves: [],
        activeBullets: [],
        raycaster: new THREE.Raycaster(),
        pointer: new THREE.Vector2(),
        uiScene: null,
        ui: {},
        clock: new THREE.Clock(),
        animationFrameId: null
    };
}
