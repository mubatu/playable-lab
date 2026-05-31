import * as THREE from "three";

export class GoalPost {
    // isFlipped allows us to use the same sprite for the right side goal
    constructor(scene, position = new THREE.Vector3(0, 0, 0), isFlipped = false) {
        this.scene = scene;
        this.mesh = new THREE.Group();

        const textureLoader = new THREE.TextureLoader();
        const texture = textureLoader.load("/assets/goalPost.png");

        // Adjust 3 and 4 to match your sprite's actual aspect ratio!
        const geometry = new THREE.PlaneGeometry(3, 4);

        // Offset the geometry so the bottom rests exactly at the Y coordinate provided
        geometry.translate(0, 2, 0);

        const material = new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        const sprite = new THREE.Mesh(geometry, material);

        if (isFlipped) {
            sprite.scale.x = -1; // Flips the sprite horizontally
        }

        this.mesh.add(sprite);
        this.mesh.position.copy(position);

        // Push goalposts slightly to the background so the ball and player render in front of them
        this.mesh.position.z = -1;

        this.scene.add(this.mesh);

        // We will use this later to determine if the ball crossed the goal line
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
    }
}