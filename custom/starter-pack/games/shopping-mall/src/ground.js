import * as THREE from "three";


export class Ground{
    "use strict"

    constructor(scene, x, y, z, width, height, color = 0x228B22) {
        const geometry = new THREE.PlaneGeometry(width, height, 4, 4);
        const material = new THREE.MeshStandardMaterial({
            color: color
        });
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(new THREE.Vector3(x, y, z));
        this.mesh.rotation.x = -Math.PI / 2;
        scene.add(this.mesh);
    }
}