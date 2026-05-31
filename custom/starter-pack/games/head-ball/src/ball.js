import * as THREE from "three";

export class Ball {
    constructor(scene, position = new THREE.Vector3(0, 4, 0)) {
        this.scene = scene;
        this.radius = 0.5; // Controls the physical and visual size

        // Physics properties
        this.velocity = new THREE.Vector2(0, 0);
        this.gravity = -25;
        this.restitution = 0.75; // Bounciness (1.0 = perfect bounce, 0.0 = clay)

        this.mesh = this.importSprite();
        this.mesh.position.copy(position);
        this.scene.add(this.mesh);
    }

    importSprite() {
        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load("/assets/ball.png");

        // The diameter is exactly twice the radius
        const geometry = new THREE.PlaneGeometry(this.radius * 2, this.radius * 2);
        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        return new THREE.Mesh(geometry, material);
    }

    update(delta, player, boundsX, boundsY) {
        // 1. Apply Gravity
        this.velocity.y += this.gravity * delta;

        // 2. Move the Ball
        this.mesh.position.x += this.velocity.x * delta;
        this.mesh.position.y += this.velocity.y * delta;

        // 3. Check collision with the ENTIRE player object now
        if (player && player.boundingBox) {
            this.checkCollision(player);
        }

        // 4. Basic Ground Collision
        const groundLevel = -3;
        if (this.mesh.position.y - this.radius < groundLevel) {
            this.mesh.position.y = groundLevel + this.radius;
            this.velocity.y *= -this.restitution;
            this.velocity.x *= 0.98; // Friction slows the ball down over time
        }

        if (this.mesh.position.y + this.radius > boundsY) {
            this.mesh.position.y = boundsY - this.radius;
            this.velocity.y *= -this.restitution;
        }

        // Left Wall Bounce
        if (this.mesh.position.x - this.radius < -boundsX) {
            this.mesh.position.x = -boundsX + this.radius;
            this.velocity.x *= -this.restitution;
        }
        // Right Wall Bounce
        else if (this.mesh.position.x + this.radius > boundsX) {
            this.mesh.position.x = boundsX - this.radius;
            this.velocity.x *= -this.restitution;
        }
    }

    checkCollision(player) {
        // Circle center
        const cx = this.mesh.position.x;
        const cy = this.mesh.position.y;

        // Box bounds from the player
        const minX = player.boundingBox.min.x;
        const maxX = player.boundingBox.max.x;
        const minY = player.boundingBox.min.y;
        const maxY = player.boundingBox.max.y;

        const closestX = THREE.MathUtils.clamp(cx, minX, maxX);
        const closestY = THREE.MathUtils.clamp(cy, minY, maxY);

        const dx = cx - closestX;
        const dy = cy - closestY;
        const distanceSq = dx * dx + dy * dy;

        if (distanceSq < this.radius * this.radius && distanceSq > 0) {
            const distance = Math.sqrt(distanceSq);

            // Collision Normal (Points outward FROM the player TO the ball)
            const nx = dx / distance;
            const ny = dy / distance;

            // STEP A: Penetration Resolution (Don't get stuck)
            const overlap = this.radius - distance;
            this.mesh.position.x += nx * overlap;
            this.mesh.position.y += ny * overlap;

            // STEP B: Passive Reflection (Standard bounce)
            const dotProduct = (this.velocity.x * nx) + (this.velocity.y * ny);
            if (dotProduct < 0) {
                this.velocity.x = (this.velocity.x - 2 * dotProduct * nx) * this.restitution;
                this.velocity.y = (this.velocity.y - 2 * dotProduct * ny) * this.restitution;
            }

            // STEP C: ACTIVE IMPULSE (The Kick!)
            // We inject brand new velocity into the ball based on the player's state
            if (player.isKicking) {
                // Massive force applied in the direction of the bounce
                this.velocity.x += nx * 25;

                // Add a guaranteed upward lift (15) so kicks always arc beautifully
                this.velocity.y += ny * 20 + 15;
            } else {
                // Just touching/walking into the ball adds a small nudge
                this.velocity.x += nx * 5;
                this.velocity.y += ny * 5;
            }
        }
    }
}