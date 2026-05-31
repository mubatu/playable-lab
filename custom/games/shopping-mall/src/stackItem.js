import * as THREE from "three";

export class StackItem {
    constructor(type) {
        this.type = type;
        this.mesh = new THREE.Group();
        this.height = 0.1; // Standard height for stacking math

        if (this.type === 'money') {
            const geo = new THREE.BoxGeometry(0.8, this.height, 0.4);
            const mat = new THREE.MeshStandardMaterial({ color: 0x2ecc71 }); // Green
            this.mesh.add(new THREE.Mesh(geo, mat));
        }
        else if (this.type === 'pizza') {
            const geo = new THREE.CylinderGeometry(0.5, 0.5, this.height, 16);
            const mat = new THREE.MeshStandardMaterial({ color: 0xe67e22 }); // Orange
            this.mesh.add(new THREE.Mesh(geo, mat));
        }

        // Optional: Cast shadows
        this.mesh.children[0].castShadow = true;
    }
}