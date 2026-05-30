import * as THREE from 'three';
import { ObjectPool } from '../components/ObjectPool.js';

export class BulletFactory {
    static createPool(scene, initialSize = 60) {
        const geometry = new THREE.SphereGeometry(0.11, 12, 12);

        const createFunc = () => {
            const material = new THREE.MeshStandardMaterial({
                color: 0xffdf8b,
                emissive: 0xffb347,
                emissiveIntensity: 1.8,
                roughness: 0.2,
                metalness: 0.05
            });

            const mesh = new THREE.Mesh(geometry, material);
            mesh.visible = false;
            mesh.userData = {
                active: false,
                from: new THREE.Vector3(),
                to: new THREE.Vector3(),
                elapsed: 0,
                duration: 0.18,
                arc: 0.36,
                onImpact: null
            };

            if (scene) {
                scene.add(mesh);
            }

            return mesh;
        };

        const resetFunc = (bullet) => {
            bullet.visible = false;
            bullet.position.set(0, -100, 0);
            bullet.userData.active = false;
            bullet.userData.elapsed = 0;
            bullet.userData.onImpact = null;
        };

        return new ObjectPool(createFunc, resetFunc, initialSize);
    }

    static launch(bullet, options = {}) {
        bullet.visible = true;
        bullet.userData.active = true;
        bullet.userData.from.copy(options.from || new THREE.Vector3());
        bullet.userData.to.copy(options.to || new THREE.Vector3());
        bullet.userData.elapsed = 0;
        bullet.userData.duration = options.duration || 0.18;
        bullet.userData.arc = options.arc || 0.36;
        bullet.userData.onImpact = options.onImpact || null;
        bullet.material.color.setHex(options.color || 0xffdf8b);
        bullet.material.emissive.setHex(options.color || 0xffb347);
        bullet.position.copy(bullet.userData.from);
    }

    static update(pool, delta) {
        const bullets = Array.from(pool.active);

        for (let index = 0; index < bullets.length; index += 1) {
            const bullet = bullets[index];

            if (!bullet.userData.active) {
                continue;
            }

            bullet.userData.elapsed += delta;

            const progress = Math.min(1, bullet.userData.elapsed / bullet.userData.duration);
            const eased = progress < 0.5
                ? 4 * progress * progress * progress
                : 1 - Math.pow(-2 * progress + 2, 3) / 2;

            bullet.position.lerpVectors(bullet.userData.from, bullet.userData.to, eased);
            bullet.position.z = bullet.userData.from.z + Math.sin(progress * Math.PI) * bullet.userData.arc;
            bullet.scale.setScalar(1 + Math.sin(progress * Math.PI) * 0.45);

            if (progress >= 1) {
                if (typeof bullet.userData.onImpact === 'function') {
                    bullet.userData.onImpact();
                }

                pool.release(bullet);
            }
        }
    }
}