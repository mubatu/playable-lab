import * as THREE from "three";
import { UISettings } from "./UIScene/UISceneSettings";
import { UIScene } from "./UIScene/UIScene.js";
import { Player } from "./player.js";
import {Ball} from "./ball";
import {GoalPost} from "./goalPost";

// --- 1. CORE SCENE SETUP ---
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb); // Sky blue background

// Use Orthographic Camera for flat 2D rendering
const aspect = window.innerWidth / window.innerHeight;
const frustumSize = 15;
// The distance from the center (X=0) to the left/right edges of the screen
const boundsX = (frustumSize * aspect) / 2;
// The distance from the center (Y=0) to the top of the screen
const boundsY = frustumSize / 2;
const camera = new THREE.OrthographicCamera(
    frustumSize * aspect / -2, frustumSize * aspect / 2,
    frustumSize / 2, frustumSize / -2,
    0.1, 100
);
camera.position.z = 5;

// Initialize Renderer
const renderer = new THREE.WebGLRenderer({ antialias: false }); // False saves battery/performance on mobile
renderer.setSize(window.innerWidth, window.innerHeight);

// CRUCIAL: Prevents the mobile browser from scrolling the page when the user taps rapidly
renderer.domElement.style.touchAction = 'none';
document.body.appendChild(renderer.domElement);

// --- 2. GAME UI & INPUT SETUP ---
// This builds your UI layer, including the invisible button that creates the KickCommand
const uiScene = new UIScene(UISettings);

// --- 3. GAME OBJECTS ---
// Instantiate the player and assign it to the global window object.
// This allows the KickCommand inside your UI to find and control this specific player.
window.player1 = new Player(scene, "Blue", new THREE.Vector3(-4, 0, 0));

// Temporary Ground Line (Just for visual reference so the player isn't floating in the void)
const groundMat = new THREE.LineBasicMaterial({ color: 0x2ecc71 }); // Green grass color
const groundGeo = new THREE.BufferGeometry().setFromPoints([
    new THREE.Vector3(-15, -3, 0),
    new THREE.Vector3(15, -3, 0)
]);
const groundLine = new THREE.Line(groundGeo, groundMat);
scene.add(groundLine);

const gameBall = new Ball(scene, new THREE.Vector3(0, 5, 0));

const leftGoal = new GoalPost(scene, new THREE.Vector3(-boundsX + 1.5, -3, 0), false);
const rightGoal = new GoalPost(scene, new THREE.Vector3(boundsX - 1.5, -3, 0), true); // Flipped!

// --- 4. GAME LOOP ---
const clock = new THREE.Clock();

function animate() {
    requestAnimationFrame(animate);

    // Cap delta to prevent huge physics jumps if the browser tab lags
    const delta = Math.min(clock.getDelta(), 0.1);

    // 1. Update the player (Processes gravity, velocity, and the Math.sin kick animation)
    if (window.player1) {
        window.player1.update(delta, boundsX, boundsY);

        // Pass both horizontal and vertical bounds to the ball
        gameBall.update(delta, window.player1, boundsX, boundsY);
    }

    // 2. Render the scene
    renderer.render(scene, camera);
}

// Start the loop
animate();