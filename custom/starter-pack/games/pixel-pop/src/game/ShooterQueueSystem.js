import * as THREE from 'three';
import { createTextTexture } from '../utils/createTextTexture.js';

function createPanel(width, height, color, opacity = 0.35) {
    return new THREE.Mesh(
        new THREE.PlaneGeometry(width, height),
        new THREE.MeshBasicMaterial({ color, transparent: true, opacity, depthWrite: false })
    );
}

export class ShooterQueueSystem {
    constructor(scene, options = {}) {
        this.scene = scene;
        this.shooterPool = options.shooterPool;
        this.queueCount = options.queueCount || 4;
        this.queueLength = options.queueLength || 4;
        this.bucketSize = options.bucketSize || 5;
        this.queueAnchorY = options.queueAnchorY || -5;
        this.bucketAnchorY = options.bucketAnchorY || -5.5;
        this.onSelectShooter = options.onSelectShooter || null;

        this.group = new THREE.Group();
        this.queueSlots = [];
        this.bucketSlots = [];
        this.queueHitAreas = [];
        this.queueWidth = 3.55;
        this.queueStep = 0.9;
        this.bucketStep = 1.05;
        this.bucketCount = 0;
        this.bucketGroup = new THREE.Group();
        this.bucketX = options.bucketX || 8.15;

        this.buildDecor();

        if (this.scene) {
            this.scene.add(this.group);
        }
    }

    buildDecor() {
        const totalWidth = (this.queueCount - 1) * this.queueWidth + 1.7;
        const basePanel = createPanel(totalWidth + 2, 3.1, 0x07111d, 0.42);
        basePanel.position.set(0, this.queueAnchorY + 1.2, 0.02);
        this.group.add(basePanel);

        for (let queueIndex = 0; queueIndex < this.queueCount; queueIndex += 1) {
            const x = (queueIndex - (this.queueCount - 1) / 2) * this.queueWidth;
            const rack = createPanel(2.2, 2.8, 0x13203b, 0.62);
            rack.position.set(x, this.queueAnchorY + 1.08, 0.03);
            this.group.add(rack);

            const queueHitArea = new THREE.Mesh(
                new THREE.PlaneGeometry(2.5, 3.35),
                new THREE.MeshBasicMaterial({
                    color: 0xffffff,
                    transparent: true,
                    opacity: 0.001,
                    depthWrite: false
                })
            );
            queueHitArea.position.set(x, this.queueAnchorY + 0.98, 0.07);
            queueHitArea.userData = {
                type: 'queue-hit-area',
                queueIndex
            };
            this.group.add(queueHitArea);

            const queue = {
                index: queueIndex,
                x,
                items: [],
                hitArea: queueHitArea
            };

            this.queueSlots.push(queue);
            this.queueHitAreas.push(queueHitArea);
        }

        const bucketPanel = createPanel(1.95, 4.45, 0x0f1b33, 0.72);
        bucketPanel.position.set(this.bucketX, this.bucketAnchorY + 1.75, 0.03);
        this.group.add(bucketPanel);

        const bucketLabel = new THREE.Mesh(
            new THREE.PlaneGeometry(1.75, 0.62),
            new THREE.MeshBasicMaterial({
                map: createTextTexture('BUCKET', {
                    width: 512,
                    height: 160,
                    background: 'rgba(17, 30, 58, 0.92)',
                    radius: 22,
                    color: '#ffffff',
                    borderColor: 'rgba(175, 208, 255, 0.16)',
                    borderWidth: 4,
                    fontSize: 64,
                    weight: 900
                }),
                transparent: true,
                depthWrite: false
            })
        );
        bucketLabel.position.set(this.bucketX, this.bucketAnchorY + 4.05, 0.06);
        this.group.add(bucketLabel);
        this.group.add(this.bucketGroup);
    }

    addShooterToQueue(queueIndex, shooter) {
        const queue = this.queueSlots[queueIndex];

        if (!queue) {
            return;
        }

        shooter.userData.queueIndex = queueIndex;
        shooter.userData.slotIndex = queue.items.length;
        shooter.userData.slotType = 'queue';
        queue.items.push(shooter);
        this.group.add(shooter);
    }

    addToBucket(shooter) {
        if (this.bucketCount >= this.bucketSize) {
            return false;
        }

        shooter.userData.queueIndex = -1;
        shooter.userData.slotIndex = this.bucketSlots.length;
        shooter.userData.slotType = 'bucket';
        this.bucketSlots.push(shooter);
        this.bucketCount = this.bucketSlots.length;
        this.group.add(shooter);
        return true;
    }

    detachShooter(shooter) {
        const queueIndex = shooter.userData.queueIndex;

        if (queueIndex >= 0) {
            const queue = this.queueSlots[queueIndex];
            const itemIndex = queue.items.indexOf(shooter);

            if (itemIndex !== 0) {
                return null;
            }

            queue.items.shift();
            return { source: 'queue', queueIndex };
        }

        const bucketIndex = this.bucketSlots.indexOf(shooter);

        if (bucketIndex === -1) {
            return null;
        }

        this.bucketSlots.splice(bucketIndex, 1);
        this.bucketCount = this.bucketSlots.length;
        return { source: 'bucket', queueIndex: -1 };
    }

    getFrontShooter() {
        for (let index = 0; index < this.queueSlots.length; index += 1) {
            if (this.queueSlots[index].items.length > 0) {
                return this.queueSlots[index].items[0];
            }
        }

        return this.bucketSlots[0] || null;
    }

    getQueueCounts() {
        return this.queueSlots.map((queue) => queue.items.length);
    }

    getInteractiveMeshes() {
        const meshes = [];

        for (let index = 0; index < this.queueSlots.length; index += 1) {
            meshes.push(this.queueSlots[index].hitArea);
        }

        for (let index = 0; index < this.bucketSlots.length; index += 1) {
            this.bucketSlots[index].userData.interactive = true;
            meshes.push(this.bucketSlots[index]);
        }

        return meshes;
    }

    resolveMesh(mesh) {
        if (!mesh) {
            return null;
        }

        if (mesh.userData && mesh.userData.type === 'queue-hit-area') {
            const queue = this.queueSlots[mesh.userData.queueIndex];
            return queue ? queue.items[0] || null : null;
        }

        return mesh.parent && mesh.parent.userData && typeof mesh.parent.userData.bulletsRemaining === 'number' ? mesh.parent : mesh;
    }

    layout() {
        for (let queueIndex = 0; queueIndex < this.queueSlots.length; queueIndex += 1) {
            const queue = this.queueSlots[queueIndex];

            for (let slotIndex = 0; slotIndex < queue.items.length; slotIndex += 1) {
                const shooter = queue.items[slotIndex];
                const topOffset = (this.queueLength - 1 - slotIndex) * this.queueStep;
                shooter.position.set(queue.x, this.queueAnchorY + topOffset, 0.2 + slotIndex * 0.06);
                shooter.scale.setScalar(1 - slotIndex * 0.06);
                shooter.rotation.z = 0;
                shooter.userData.queueIndex = queueIndex;
                shooter.userData.slotIndex = slotIndex;
                shooter.userData.slotType = 'queue';
            }
        }

        for (let slotIndex = 0; slotIndex < this.bucketSlots.length; slotIndex += 1) {
            const shooter = this.bucketSlots[slotIndex];
            shooter.position.set(this.bucketX, this.bucketAnchorY + slotIndex * this.bucketStep, 0.35 + slotIndex * 0.04);
            shooter.scale.setScalar(0.94);
            shooter.rotation.z = 0;
            shooter.userData.interactive = true;
            shooter.userData.slotType = 'bucket';
            shooter.userData.slotIndex = slotIndex;
        }
    }

    update() {
        this.layout();
    }
}