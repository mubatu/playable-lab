import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import {StackItem} from "./stackItem";

export class Player {
    constructor(scene, position = new THREE.Vector3(0, 0, 0), speed = 10) {
        this.scene = scene;
        this.speed = speed;
        this.direction = 0;

        this.inventory = { cash: 0, items: 0};
        this.stackedItems = [];
        this.maxStackSize = 10;
        this.stackBaseY = 2;

        this.mesh = new THREE.Group();
        this.mesh.position.copy(position);
        scene.add(this.mesh);

        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);

        // 1. State tracking for animations
        this.previousPosition = new THREE.Vector3().copy(position);
        this.actions = {}; // Store all animation clips here
        this.activeActionName = null;

        // 2. Load models (Assuming separate files like Mixamo exports)
        const loader = new GLTFLoader();

        loader.load("/assets/InPlaceRun.glb", (gltf) => {
            this.model = gltf.scene;
            this.model.scale.set(1, 1, 1);
            this.mesh.add(this.model);

            this.mixer = new THREE.AnimationMixer(this.model);

            // Save the run action
            this.actions['run'] = this.mixer.clipAction(gltf.animations[0]);

            // 3. Load the Idle animation and apply it to the SAME mixer
            loader.load("/assets/HappyIdle.glb", (idleGltf) => {
                this.actions['idle'] = this.mixer.clipAction(idleGltf.animations[0]);

                // Start the game in the idle state
                this.activeActionName = 'idle';
                this.actions['idle'].play();
            });

            this.boundingBox.setFromObject(this.mesh);
        });
    }

    // 4. Smooth Transition Logic
    fadeToAction(name, duration = 0.2) {
        // Don't transition if the requested animation is already playing,
        // or if the animations haven't finished loading yet.
        if (this.activeActionName === name || !this.actions[name] || !this.actions[this.activeActionName]) return;

        const previousAction = this.actions[this.activeActionName];
        const activeAction = this.actions[name];

        // Fade out the old, fade in the new
        previousAction.fadeOut(duration);
        activeAction.reset().fadeIn(duration).play();

        this.activeActionName = name;
    }

    update(delta) {

        // 5. Calculate internal velocity to determine movement state
        const distanceMoved = this.mesh.position.distanceToSquared(this.previousPosition);
        const isMoving = distanceMoved > 0.00001;

        // Switch animations based on movement state
        if (isMoving) {
            this.fadeToAction('run');
        } else {
            this.fadeToAction('idle');
        }

        // Update the previous position for the next frame's calculation
        this.previousPosition.copy(this.mesh.position);

        if (this.mixer) {
            this.mixer.update(delta);
        }

        this.boundingBox.setFromObject(this.mesh);

        this.updateCamera(delta);
    }

    attachCamera(camera) {
        this.camera = camera;
    }

    updateCamera(delta) {
        if (window.playerMovementCommand) {
            window.playerMovementCommand.execute(this.mesh, 0.05); // Consider multiplying by delta here in the future!
        }
        const displacement = new THREE.Vector3().subVectors(this.mesh.position, this.previousPosition);

        if (displacement.lengthSq() > 0.00001) {
            // Calculate the target angle in radians based on X and Z movement
            const targetAngle = Math.atan2(displacement.x, displacement.z);

            // Create a quaternion representing this new rotation
            const targetRotation = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), targetAngle);

            // Smoothly rotate the player mesh towards the target rotation.
            // The '10 * delta' controls the turning speed. Higher = faster snapping.
            this.mesh.quaternion.slerp(targetRotation, 10 * delta);
        }
        // ----------------------------------

        // 4. Camera tracking logic
        this.camera.position.add(displacement);
    }

    addStackItem(itemType) {
        if (this.stackedItems.length >= this.maxStackSize) {
            console.log("Inventory full!");
            return false;
        }

        // 1. Create the new item
        const newItem = new StackItem(itemType);

        // 2. Calculate its Y position based on how many items we already have
        // Formula: Base Height + (Number of Items * Height of One Item)
        const newY = this.stackBaseY + (this.stackedItems.length * newItem.height);
        newItem.mesh.position.set(0, newY, 0);

        // 3. Attach it to the player's mesh so it moves and rotates with the player
        this.mesh.add(newItem.mesh);

        // 4. Store it in our inventory array
        this.stackedItems.push(newItem);

        return true; // Successfully added
    }

    removeStackItem(type) {
        // findLastIndex ensures we grab the money highest up in the stack
        const index = this.stackedItems.findLastIndex(item => item.type === type);

        if (index !== -1) {
            const itemToRemove = this.stackedItems[index];

            // 1. Remove it from the 3D scene
            this.mesh.remove(itemToRemove.mesh);

            // 2. Remove it from our tracking array
            this.stackedItems.splice(index, 1);

            // 3. Fix the visual gaps
            this.recalculateStackPositions();
            return true;
        }
        return false; // Player didn't have this item
    }

    // Drops everything
    clearStack() {
        this.stackedItems.forEach(item => {
            this.mesh.remove(item.mesh);
        });
        this.stackedItems = [];
    }

    // Shifts all remaining items down so they sit perfectly on top of each other
    recalculateStackPositions() {
        this.stackedItems.forEach((item, index) => {
            const newY = this.stackBaseY + (index * item.height);
            item.mesh.position.set(0, newY, 0);
        });
    }
}