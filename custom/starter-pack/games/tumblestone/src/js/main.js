import { SceneSetup } from '../../../../reusables/components/SceneSetup.js';
import { TextureUtils } from '../../../../reusables/components/TextureUtils.js';
import { GAME_CONFIG } from '../config/game-config.js';
import { createGameState, initGameObjects, resetGame } from './GameState.js';
import { loadTileTextures } from './Tiles.js';
import { buildHud } from './Hud.js';
import { bindInteractions } from './Interaction.js';
import { updateAnimations } from './Gameplay.js';
import { updateTutorial } from './Tutorial.js';

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
    function frame() {
        var delta = Math.min(state.clock.getDelta(), 0.05);

        updateAnimations(state, delta);
        updateTutorial(state);

        if (state.shakeTime > 0) {
            state.shakeTime -= delta;
            var shake = Math.max(state.shakeTime, 0) * 0.18;
            state.board.position.x = (Math.random() - 0.5) * shake;
            state.board.position.y = state.config.board.offsetY + ((Math.random() - 0.5) * shake);
        } else {
            state.board.position.x = 0;
            state.board.position.y = state.config.board.offsetY;
        }

        state.sceneManager.update(delta);
        state.sceneManager.render(state.camera);
        state.animationFrameId = window.requestAnimationFrame(frame);
    }

    frame();
}

function createGame(textures) {
    var state = createGameState(GAME_CONFIG, textures);
    var renderer = state.renderer;
    var camera = state.camera;
    var background = state.background;

    SceneSetup.configureRenderer(renderer);
    SceneSetup.fitOrthographicCamera(camera, background.size);

    appRoot.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    state.sceneManager.addObject(background.mesh);
    state.sceneManager.addObject(state.board);
    state.sceneManager.addObject(state.slotsGroup);

    initGameObjects(state);
    buildHud(state, function () {
        resetGame(state);
    });
    bindInteractions(state);

    window.addEventListener('resize', function () {
        SceneSetup.configureRenderer(renderer);
        SceneSetup.fitOrthographicCamera(camera, background.size);
    });

    window.TumblestoneLite = {
        state: state,
        config: GAME_CONFIG,
        scene: state.scene,
        camera: camera,
        renderer: renderer,
        board: state.board,
        grid: state.grid,
        sceneManager: state.sceneManager
    };

    startLoop(state);
}

Promise.all([
    TextureUtils.load(GAME_CONFIG.background.imageUrl),
    loadTileTextures(GAME_CONFIG.tiles)
]).then(function (results) {
    createGame({
        background: results[0],
        tiles: results[1]
    });
}).catch(function (error) {
    console.error(error);
    showError(error.message + ' Run this ad from a local server so image assets can load.');
});
