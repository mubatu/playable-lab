import * as THREE from 'three';

function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}

export class PathTrack {
    constructor(options = {}) {
        this.center = options.center || { x: 0, y: 0, z: 0 };
        this.width = options.width || 10;
        this.height = options.height || 8;
        this.railHeight = options.railHeight || 0.22;
        this.railThickness = options.railThickness || 0.16;
        this.group = new THREE.Group();

        this.left = this.center.x - this.width / 2;
        this.right = this.center.x + this.width / 2;
        this.top = this.center.y + this.height / 2;
        this.bottom = this.center.y - this.height / 2;
        this.perimeter = this.width * 2 + this.height * 2;

        this.buildVisuals();
    }

    buildVisuals() {
        const corners = [
            new THREE.Vector3(this.left, this.bottom, this.center.z),
            new THREE.Vector3(this.right, this.bottom, this.center.z),
            new THREE.Vector3(this.right, this.top, this.center.z),
            new THREE.Vector3(this.left, this.top, this.center.z),
            new THREE.Vector3(this.left, this.bottom, this.center.z)
        ];

        const line = new THREE.Line(
            new THREE.BufferGeometry().setFromPoints(corners),
            new THREE.LineBasicMaterial({ color: 0x8fb1ff, transparent: true, opacity: 0.75 })
        );
        this.group.add(line);

        const railMaterial = new THREE.MeshStandardMaterial({
            color: 0x1b2540,
            emissive: 0x0a1020,
            emissiveIntensity: 0.45,
            roughness: 0.58,
            metalness: 0.22,
            transparent: true,
            opacity: 0.82
        });

        const horizontalGeometry = new THREE.BoxGeometry(this.width + this.railThickness, this.railHeight, this.railThickness);
        const verticalGeometry = new THREE.BoxGeometry(this.railThickness, this.height + this.railThickness, this.railThickness);

        const bottomRail = new THREE.Mesh(horizontalGeometry, railMaterial.clone());
        bottomRail.position.set(this.center.x, this.bottom, this.center.z - 0.1);

        const topRail = new THREE.Mesh(horizontalGeometry, railMaterial.clone());
        topRail.position.set(this.center.x, this.top, this.center.z - 0.1);

        const leftRail = new THREE.Mesh(verticalGeometry, railMaterial.clone());
        leftRail.position.set(this.left, this.center.y, this.center.z - 0.1);

        const rightRail = new THREE.Mesh(verticalGeometry, railMaterial.clone());
        rightRail.position.set(this.right, this.center.y, this.center.z - 0.1);

        this.group.add(bottomRail, topRail, leftRail, rightRail);
    }

    getPointAtDistance(distance) {
        const localDistance = ((distance % this.perimeter) + this.perimeter) % this.perimeter;

        if (localDistance <= this.width) {
            return new THREE.Vector3(this.left + localDistance, this.bottom, this.center.z + 0.6);
        }

        if (localDistance <= this.width + this.height) {
            return new THREE.Vector3(this.right, this.bottom + (localDistance - this.width), this.center.z + 0.6);
        }

        if (localDistance <= this.width * 2 + this.height) {
            return new THREE.Vector3(this.right - (localDistance - this.width - this.height), this.top, this.center.z + 0.6);
        }

        return new THREE.Vector3(this.left, this.top - (localDistance - this.width * 2 - this.height), this.center.z + 0.6);
    }

    getStateAtDistance(distance) {
        const localDistance = ((distance % this.perimeter) + this.perimeter) % this.perimeter;

        if (localDistance <= this.width) {
            return { side: 'bottom', angle: 0, progress: localDistance / this.width };
        }

        if (localDistance <= this.width + this.height) {
            return { side: 'right', angle: Math.PI / 2, progress: (localDistance - this.width) / this.height };
        }

        if (localDistance <= this.width * 2 + this.height) {
            return { side: 'top', angle: Math.PI, progress: (localDistance - this.width - this.height) / this.width };
        }

        return { side: 'left', angle: -Math.PI / 2, progress: (localDistance - this.width * 2 - this.height) / this.height };
    }

    distanceAtBottomX(x) {
        return clamp(x, this.left, this.right) - this.left;
    }
}