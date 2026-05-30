import * as THREE from "three";

export class Player {
    constructor(scene, color, position = new THREE.Vector3(0, 0, 0)) {
        this.scene = scene;
        this.mesh = new THREE.Group();

        const headMesh = this.importSprite(`/assets/${color}Head.png`, 2, 2, false);
        // Pass 'true' so the legs pivot from the top (the hip)
        const leftLegMesh = this.importSprite(`/assets/${color}LeftLeg.png`, 1, 1, true);
        this.rightLegMesh = this.importSprite(`/assets/${color}RightLeg.png`, 1, 1, true);

        headMesh.position.set(0, 0, 0);
        // Adjusted Y from -1 to -0.5 because the geometry's center has shifted
        leftLegMesh.position.set(-0.5, -0.5, -0.1);
        this.rightLegMesh.position.set(0.5, -0.5, 0.1);

        this.mesh.add(headMesh);
        this.mesh.add(leftLegMesh);
        this.mesh.add(this.rightLegMesh);

        this.mesh.position.copy(position);
        this.scene.add(this.mesh);

        // --- ANIMATION STATE ---
        this.isKicking = false;
        this.kickTimer = 0;
        this.kickDuration = 0.3; // The kick takes 300 milliseconds

        this.boundingBox = new THREE.Box3();
    }

    importSprite(spritePath, width, height, isLeg) {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load(spritePath);

        const geometry = new THREE.PlaneGeometry(width, height);

        // CRUCIAL PIVOT TRICK: Shift the geometry down by half its height.
        // Now, coordinates (0,0) are at the top edge of the image, not the center.
        if (isLeg) {
            geometry.translate(0, -height / 2, 0);
        }

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        return new THREE.Mesh(geometry, material);
    }

    kick() {
        // Prevent restarting the animation if the leg is already swinging
        if (!this.isKicking) {
            this.isKicking = true;
            this.kickTimer = 0;
        }
    }

    update(delta, boundsX, boundsY) {
        if (this.isKicking) {
            this.kickTimer += delta;

            const progress = this.kickTimer / this.kickDuration;

            if (progress >= 1) {
                this.isKicking = false;
                this.rightLegMesh.rotation.z = 0;
            } else {
                const angle = Math.sin(progress * Math.PI) * (Math.PI / 2);
                this.rightLegMesh.rotation.z = angle;
            }
        }

        if (window.playerMovementCommand) {
            window.playerMovementCommand.execute(this.mesh, 0.05);
        }

        // --- SCREEN BOUNDARIES ---

        // 1. Horizontal (X-Axis) Limit
        // Offset by 1 to account for the player's width
        const maxX = boundsX - 1;
        this.mesh.position.x = THREE.MathUtils.clamp(this.mesh.position.x, -maxX, maxX);

        // 2. Vertical (Y-Axis) Limit
        // Offset by ~1.5 to account for the player's height (head to toes)
        const maxY = boundsY - 1.5;

        // *Note: If you want the player to stay on the grass instead of flying to the bottom
        // of the screen, change `-maxY` below to your ground level (e.g., -3).*
        this.mesh.position.y = THREE.MathUtils.clamp(this.mesh.position.y, -maxY, maxY);

        // Update physics boundary
        this.boundingBox.setFromObject(this.mesh);
    }
}