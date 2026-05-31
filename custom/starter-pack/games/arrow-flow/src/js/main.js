import { SceneSetup } from '../../../../reusables/components/SceneSetup.js';
import { CONFIG } from '../config/game-config.js';
import { LEVELS } from '../config/level-data.js';
import { createGameState, GameStateName } from './GameState.js';
import { buildHud, refreshCellDisplay } from './Hud.js';
import { bindInteractions } from './Interaction.js';
import { updateArrowExitSystem } from './ArrowExitSystem.js';
import { updateFramePathSystem } from './FramePathSystem.js';
import { resolveShooterFire, updateShooterEffects } from './ShooterSystem.js';
import { updateWinLoseSystem } from './WinLoseSystem.js';

var appRoot = document.getElementById('app') || document.body;
var errorBanner = document.getElementById('error-banner');

function showError(message) {
    if (!errorBanner) {
        return;
    }

    errorBanner.textContent = message;
    errorBanner.hidden = false;
}

function fitPlayableCamera(camera, config) {
    var cameraConfig = config.camera || {};
    var worldHeight = cameraConfig.framingWorldHeight || config.background.worldHeight;
    var aspect = window.innerWidth / window.innerHeight;

    camera.top = worldHeight * 0.5;
    camera.bottom = -worldHeight * 0.5;
    camera.right = camera.top * aspect;
    camera.left = -camera.right;
    camera.near = 0.1;
    camera.far = 40;
}

function applyCameraAngle(camera, config) {
    var cameraConfig = config.camera || {};
    var position = cameraConfig.position || { x: 0, y: -5.2, z: 10 };
    var lookAt = cameraConfig.lookAt || { x: 0, y: 0, z: 0 };

    camera.position.set(position.x, position.y, position.z);
    camera.lookAt(lookAt.x, lookAt.y, lookAt.z);
    camera.updateProjectionMatrix();
}

function startLoop(state) {
    function frame() {
        var delta = Math.min(state.clock.getDelta(), 0.05);

        if (state.stateName === GameStateName.PLAYING) {
            updateArrowExitSystem(state, delta);
            updateFramePathSystem(state, delta);
            resolveShooterFire(state);
            updateWinLoseSystem(state, delta);
        }

        updateShooterEffects(state, delta);
        state.sceneManager.update(delta);
        state.sceneManager.render(state.camera);
        state.animationFrameId = window.requestAnimationFrame(frame);
    }

    frame();
}

function createGame(config, level) {
    var state = createGameState(config, level);
    var renderer = state.renderer;
    var camera = state.camera;

    SceneSetup.configureRenderer(renderer);
    fitPlayableCamera(camera, config);
    applyCameraAngle(camera, config);

    appRoot.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = 'none';

    state.sceneManager.addObject(state.background.mesh);
    state.sceneManager.addObject(state.board);
    state.stateName = GameStateName.PLAYING;

    buildHud(state);
    refreshCellDisplay(state);
    bindInteractions(state);

    window.addEventListener('resize', function () {
        SceneSetup.configureRenderer(renderer);
        fitPlayableCamera(camera, config);
        applyCameraAngle(camera, config);
    });

    window.ArrowFlow3 = {
        state: state,
        config: config,
        level: level,
        scene: state.scene,
        camera: camera,
        renderer: renderer,
        board: state.board,
        boardMetrics: state.boardMetrics,
        arrows: state.arrows,
        grid: state.grid,
        framePath: state.framePath
    };

    startLoop(state);
}

try {
    createGame(CONFIG, LEVELS[0]);
} catch (error) {
    console.error(error);
    showError(error.message);
}
