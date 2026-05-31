import * as THREE from "three";


export class OperationField{
    constructor(scene, position = new THREE.Vector3(0, 0, 0), width, height) {
        const geometry = new THREE.BoxGeometry(width, height, 0.1);
        const material = new THREE.MeshStandardMaterial({});
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.copy(position);
        this.mesh.rotation.x = -Math.PI / 2;
        this.boundingBox = new THREE.Box3().setFromObject(this.mesh);
        this.detectObjects = [];
        scene.add(this.mesh);
    }

    enableDetections(otherObject, onTrigger) {
        this.detectObjects.push({
            object: otherObject,
            onTrigger: onTrigger
        });
    }

    update(delta){
        this.detectObjects
            .filter(detectObject => this.checkCollision(detectObject))
            .forEach(detectObject => {
                if (detectObject.onTrigger) {
                    detectObject.onTrigger(detectObject.object, delta);
                }
            })
    }

    checkCollision(detectObject){
        return this.boundingBox.intersectsBox(detectObject?.object?.boundingBox);
    }
}