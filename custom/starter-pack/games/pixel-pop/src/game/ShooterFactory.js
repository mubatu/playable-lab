import * as THREE from 'three';
import { ObjectPool } from '../components/ObjectPool.js';
import { createTextTexture } from '../utils/createTextTexture.js';

function disposeTexture(texture) {
    if (texture && typeof texture.dispose === 'function') {
        texture.dispose();
    }
}

export class ShooterFactory {
    static createPool(scene, initialSize = 20) {
        const bodyGeometry = new THREE.CylinderGeometry(0.34, 0.4, 1.0, 8);
        const capGeometry = new THREE.SphereGeometry(0.26, 12, 12);
        const badgeGeometry = new THREE.PlaneGeometry(0.92, 0.48);

        const createFunc = () => {
            const group = new THREE.Group();

            const bodyMaterial = new THREE.MeshStandardMaterial({
                color: 0x6aa8ff,
                emissive: 0x111827,
                emissiveIntensity: 0.7,
                roughness: 0.35,
                metalness: 0.18
            });

            const accentMaterial = new THREE.MeshStandardMaterial({
                color: 0xf4f7ff,
                emissive: 0xffffff,
                emissiveIntensity: 0.18,
                roughness: 0.18,
                metalness: 0.08
            });

            const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
            body.rotation.x = Math.PI / 2;

            const cap = new THREE.Mesh(capGeometry, accentMaterial);
            cap.position.z = 0.54;

            const badgeMaterial = new THREE.MeshBasicMaterial({ transparent: true, depthTest: false });
            const badge = new THREE.Mesh(badgeGeometry, badgeMaterial);
            badge.position.z = 0.78;

            group.add(body, cap, badge);
            group.visible = false;
            group.userData = {
                bulletsRemaining: 0,
                maxBullets: 0,
                color: 0x6aa8ff,
                active: false,
                labelTexture: null,
                badge,
                body,
                cap,
                bodyMaterial,
                accentMaterial,
                badgeMaterial,
                speed: 7.8,
                run: null
            };

            if (scene) {
                scene.add(group);
            }

            return group;
        };

        const resetFunc = (shooter) => {
            const { badgeMaterial, labelTexture, bodyMaterial, accentMaterial } = shooter.userData;

            disposeTexture(labelTexture);
            badgeMaterial.map = null;
            shooter.position.set(0, -100, 0);
            shooter.rotation.set(0, 0, 0);
            shooter.scale.set(1, 1, 1);
            shooter.visible = false;
            shooter.userData.bulletsRemaining = 0;
            shooter.userData.maxBullets = 0;
            shooter.userData.active = false;
            shooter.userData.run = null;
            shooter.userData.interactive = false;
            shooter.userData.queueIndex = -1;
            shooter.userData.slotIndex = -1;
            shooter.userData.slotType = null;
            shooter.userData.labelTexture = null;
            bodyMaterial.color.setHex(0x6aa8ff);
            accentMaterial.color.setHex(0xf4f7ff);
        };

        return new ObjectPool(createFunc, resetFunc, initialSize);
    }

    static configure(shooter, options = {}) {
        const bulletsRemaining = options.bulletsRemaining ?? options.label ?? 0;
        const color = options.color || 0x6aa8ff;

        shooter.visible = true;
        shooter.userData.bulletsRemaining = bulletsRemaining;
        shooter.userData.maxBullets = bulletsRemaining;
        shooter.userData.color = color;
        shooter.userData.active = false;
        shooter.userData.run = null;
        shooter.userData.bodyMaterial.color.setHex(color);
        shooter.userData.accentMaterial.color.setHex(0xf5f7ff);
        shooter.userData.badgeMaterial.map = createTextTexture(String(bulletsRemaining), {
            width: 256,
            height: 128,
            background: 'rgba(13, 21, 39, 0.78)',
            radius: 20,
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 4,
            fontSize: 68,
            weight: 900
        });
        shooter.userData.badgeMaterial.needsUpdate = true;
        shooter.userData.labelTexture = shooter.userData.badgeMaterial.map;
    }

    static setLabel(shooter, bulletsRemaining) {
        disposeTexture(shooter.userData.labelTexture);
        shooter.userData.labelTexture = createTextTexture(String(bulletsRemaining), {
            width: 256,
            height: 128,
            background: 'rgba(13, 21, 39, 0.78)',
            radius: 20,
            color: '#ffffff',
            borderColor: 'rgba(255, 255, 255, 0.15)',
            borderWidth: 4,
            fontSize: 68,
            weight: 900
        });
        shooter.userData.badgeMaterial.map = shooter.userData.labelTexture;
        shooter.userData.badgeMaterial.needsUpdate = true;
    }

    static release(shooter, pool) {
        if (!pool) {
            return;
        }

        pool.release(shooter);
    }
}