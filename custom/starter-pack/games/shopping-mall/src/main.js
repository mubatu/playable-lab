import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { UISettings } from "./UIScene/UISceneSettings.js";
import { UIScene } from "./UIScene/UIScene.js";
import { Ground } from "./ground";
import { Player } from "./player";
import { OperationField } from "./operationField";

const scene = new THREE.Scene();
scene.background = new THREE.Color(0x87ceeb);

const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(1, 4, 6);

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);

new UIScene(UISettings);
new Ground(scene, 0, -5, 0, 50, 50);

const player = new Player(scene, new THREE.Vector3(0, -4, 0));
player.attachCamera(camera);
controls.target.copy(player.mesh.position);

const light = new THREE.DirectionalLight(0xffffff, 3);
light.position.set(10, 10, 10);
scene.add(light);

const clock = new THREE.Clock();

// 1. Use separate timers for each zone to prevent timing bugs
let pizzaTimer = 0;
let moneyTimer = 0;
let trashTimer = 0;
const spawnRate = 0.5;

const moneyGeneratorZone = new OperationField(scene, new THREE.Vector3(-3, -4, -3), 2, 2);
const pizzaGeneratorZone = new OperationField(scene, new THREE.Vector3(3, -4, 3), 2, 2);

// 2. Add the third zone to free the stack
const trashZone = new OperationField(scene, new THREE.Vector3(3, -4, -3), 2, 2);


moneyGeneratorZone.enableDetections(player, (collidingPlayer, delta) => {
    moneyTimer += delta;
    if (moneyTimer >= spawnRate) {
        const success = collidingPlayer.addStackItem('money');
        if (success) {
            console.log("Collected money!");
            moneyTimer = 0;
        }
    }
});

pizzaGeneratorZone.enableDetections(player, (collidingPlayer, delta) => {
    pizzaTimer += delta;

    if (pizzaTimer >= spawnRate) {

        // 1. Attempt to pay FIRST.
        // If they have money, removeStackItem deletes it and returns true.
        // This inherently frees up 1 slot in the inventory.
        const paid = collidingPlayer.removeStackItem('money');

        if (paid) {
            // 2. Since payment succeeded, we have guaranteed space. Grant the pizza!
            collidingPlayer.addStackItem('pizza');
            console.log("Bought a pizza!");
        } else {
            console.log("Not enough money for pizza!");
        }

        // Reset timer regardless of success or failure to prevent spamming
        pizzaTimer = 0;
    }
});

// 4. Trash logic: Rapidly remove items from the top of the stack
trashZone.enableDetections(player, (collidingPlayer, delta) => {
    trashTimer += delta;

    // We make this happen much faster (every 0.1 seconds) for a cool visual effect
    if (trashTimer >= 0.1) {
        if (collidingPlayer.stackedItems.length > 0) {
            // Get the type of the item at the very top of the stack
            const topItem = collidingPlayer.stackedItems[collidingPlayer.stackedItems.length - 1];
            collidingPlayer.removeStackItem(topItem.type);
            console.log("Freed an item!");
            trashTimer = 0;
        }
    }
});

function animate() {
    const delta = clock.getDelta();

    player.update(delta);

    pizzaGeneratorZone.update(delta);
    moneyGeneratorZone.update(delta);
    trashZone.update(delta); // Update the new zone

    controls.target.copy(player.mesh.position);
    controls.update();
    renderer.render(scene, camera);
}
renderer.setAnimationLoop(animate);