import { ConfigLoader } from '../../../../reusables/components/ConfigLoader.js';
import { SceneSetup } from '../../../../reusables/components/SceneSetup.js';
import { createGameState, resetGame } from './GameState.js';
import { initSpawnSlots } from './SpawnSlots.js';
import { bindInteractions } from './Interaction.js';
import { buildHud, refreshScoreDisplay } from './Hud.js';
import { scheduleTutorial } from './Tutorial.js';

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

        if (state.shakeTime > 0) {
            state.shakeTime -= delta;
            var shakeIntensity = Math.max(state.shakeTime, 0) * 8;
            state.board.position.x = (Math.random() - 0.5) * shakeIntensity * 0.08;
            state.board.position.y = state.config.board.offsetY + (Math.random() - 0.5) * shakeIntensity * 0.08;
        } else {
            state.board.position.x = 0;
            state.board.position.y = state.config.board.offsetY;
        }

        state.sceneManager.render(state.camera);
        state.animationFrameId = window.requestAnimationFrame(frame);
    }

    frame(performance.now());
}

function createGame(config) {
    var state = createGameState(config);
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

    initSpawnSlots(state);
    buildHud(state, function () {
        resetGame(state);
    });
    refreshScoreDisplay(state);
    bindInteractions(state);
    scheduleTutorial(state);

    window.addEventListener('resize', function () {
        SceneSetup.configureRenderer(renderer);
        SceneSetup.fitOrthographicCamera(camera, background.size);
    });

    window.BlockBlast = {
        state: state,
        config: config,
        scene: state.scene,
        camera: camera,
        renderer: renderer,
        board: state.board,
        grid: state.grid,
        sceneManager: state.sceneManager
    };

    startLoop(state);
}

ConfigLoader.load(CONFIG_PATH).then(function (config) {
    createGame(config);
}).catch(function (error) {
    console.error(error);
    showError(error.message + ' Run this ad from a local server so the JSON config can load.');
});
