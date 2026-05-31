import { PoolFactory } from "./PoolFactory";
import * as THREE from "three";
import { ObjectPool } from "./ObjectPool";

export class ParticleFactory extends PoolFactory {
    static createPool(scene, initialSize = 50) {
        // 1. SHARE GEOMETRY & MATERIAL
        // Creating these OUTSIDE the createFunc ensures they are only stored in memory once,
        // drastically reducing WebGL overhead for playable ads.
        const geometry = new THREE.BoxGeometry(0.2, 0.2, 0.2);
        const material = new THREE.MeshBasicMaterial({
            color: 0xffaa00, // Golden explosion color
            transparent: true,
            opacity: 1
        });

        const createFunc = () => {
            const particle = new THREE.Mesh(geometry, material);

            // 2. ATTACH CUSTOM STATE DATA
            // We use Three.js's built-in .userData object to store physics and life variables
            particle.userData = {
                velocity: new THREE.Vector3(),
                life: 0,
                maxLife: 1.0 // 1 second lifespan
            };

            // Start hidden
            particle.visible = false;

            // Pre-add to scene to avoid mid-game render pipeline stalling
            if (scene) scene.add(particle);

            return particle;
        };

        const resetFunc = (particle) => {
            // Hide and move off-screen
            particle.position.set(0, -100, 0);
            particle.rotation.set(0, 0, 0);
            particle.scale.set(1, 1, 1);
            particle.visible = false;

            // Reset opacity and physics state
            particle.material.opacity = 1;
            particle.userData.velocity.set(0, 0, 0);
            particle.userData.life = 0;
        };

        return new ObjectPool(createFunc, resetFunc, initialSize);
    }
}