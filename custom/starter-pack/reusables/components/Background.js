import * as THREE from 'three';

export class Background {
    constructor(config, texture) {
        var aspectRatio = config.sourceWidth / config.sourceHeight;
        var worldHeight = config.worldHeight;

        this.size = {
            width: worldHeight * aspectRatio,
            height: worldHeight
        };

        this.geometry = new THREE.PlaneGeometry(this.size.width, this.size.height);
        this.material = new THREE.MeshBasicMaterial({ map: texture });
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.position.z = typeof config.z === 'number' ? config.z : -5;
    }

    destroy() {
        if (this.mesh.parent) {
            this.mesh.parent.remove(this.mesh);
        }

        this.geometry.dispose();
        this.material.dispose();
    }
}
