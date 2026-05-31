import { ConfigLoader } from '../../../../reusables/components/ConfigLoader.js';
import { TextureUtils } from '../../../../reusables/components/TextureUtils.js';
import { SceneSetup } from '../../../../reusables/components/SceneSetup.js';
import { createGameState, resetBoard } from './GameState.js';
import { populateInitialPieces } from './Pieces.js';
import { scheduleTutorial } from './Tutorial.js';
import { buildHud, refreshHud } from './Hud.js';
import { bindInteractions } from './Interaction.js';

var CONFIG_PATH = 'src/config/game-config.json';
var appRoot = document.getElementById('app') || document.body;
var errorBanner = document.getElementById('error-banner');

function showError(message) {
    if (!errorBanner) {
        return;
    }

    errorBanner.textContent = message;
    errorBanner.hidden = false;
}

function startLoop(state) {
    function frame(now) {
        var delta = Math.min(state.clock.getDelta(), 0.05);

        state.sceneManager.update(delta);

        if (state.tutorial) {
            state.tutorial.update(now);
        }

        state.sceneManager.render(state.camera);
        state.animationFrameId = window.requestAnimationFrame(frame);
    }

    frame(performance.now());
}

function createGame(config, assets) {
    var state = createGameState(config, assets);
    var renderer = state.renderer;
    var camera = state.camera;
    var background = state.background;

    SceneSetup.configureRenderer(renderer);
    SceneSetup.fitOrthographicCamera(camera, background.size);

    appRoot.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';
    renderer.domElement.style.cursor = 'grab';

    state.sceneManager.addObject(background.mesh);
    state.sceneManager.addObject(state.board);

    populateInitialPieces(state);
    buildHud(state, function () {
        resetBoard(state);
    });
    refreshHud(state);
    bindInteractions(state);
    scheduleTutorial(state);

    window.addEventListener('resize', function () {
        SceneSetup.configureRenderer(renderer);
        SceneSetup.fitOrthographicCamera(camera, background.size);
    });

    window.MergeMystery = {
        config: config,
        scene: state.scene,
        camera: camera,
        renderer: renderer,
        board: state.board,
        background: background.mesh,
        grid: state.grid,
        sceneManager: state.sceneManager,
        uiScene: state.uiScene,
        particlePool: state.particlePool,
        tutorial: state.tutorial,
        state: state
    };

    startLoop(state);
}

ConfigLoader.load(CONFIG_PATH).then(function (config) {
    var backgroundPath = config.background && config.background.texturePath
        ? config.background.texturePath
        : 'assets/background.png';
    var piecePaths = config.pieces && config.pieces.texturePaths
        ? config.pieces.texturePaths
        : [];

    return Promise.all([
        TextureUtils.load(backgroundPath),
        TextureUtils.loadAll(piecePaths)
    ]).then(function (results) {
        createGame(config, {
            backgroundTexture: results[0],
            pieceTextures: results[1]
        });
    });
}).catch(function (error) {
    console.error(error);
    showError(error.message + ' Run this ad from a local server so the JSON config can load.');
});
