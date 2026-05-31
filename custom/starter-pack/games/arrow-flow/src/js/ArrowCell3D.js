import * as THREE from 'three';

function roundedRectShape(width, height, radius) {
    var x = -width * 0.5;
    var y = -height * 0.5;
    var shape = new THREE.Shape();

    shape.moveTo(x + radius, y);
    shape.lineTo(x + width - radius, y);
    shape.quadraticCurveTo(x + width, y, x + width, y + radius);
    shape.lineTo(x + width, y + height - radius);
    shape.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
    shape.lineTo(x + radius, y + height);
    shape.quadraticCurveTo(x, y + height, x, y + height - radius);
    shape.lineTo(x, y + radius);
    shape.quadraticCurveTo(x, y, x + radius, y);

    return shape;
}

function createRoundedBox(width, height, depth, radius) {
    return new THREE.ExtrudeGeometry(roundedRectShape(width, height, radius), {
        depth: depth,
        bevelEnabled: true,
        bevelSegments: 4,
        bevelSize: radius * 0.24,
        bevelThickness: radius * 0.24,
        steps: 1
    });
}

function makeDarker(color) {
    return new THREE.Color(color).multiplyScalar(0.62);
}

export class ArrowCell3D extends THREE.Group {
    constructor(options) {
        super();

        var opts = options || {};
        var size = opts.size || 1;
        var depth = opts.depth || 0.24;
        var color = opts.color || '#ff3fa6';
        var body;
        var shade;
        var highlight;

        shade = new THREE.Mesh(
            createRoundedBox(size * 0.98, size * 0.98, depth * 0.44, size * 0.16),
            new THREE.MeshStandardMaterial({
                color: makeDarker(color),
                roughness: 0.52,
                metalness: 0.04
            })
        );
        shade.position.set(0, -size * 0.035, 0);
        this.add(shade);

        body = new THREE.Mesh(
            createRoundedBox(size * 0.94, size * 0.94, depth, size * 0.15),
            new THREE.MeshStandardMaterial({
                color: new THREE.Color(color),
                roughness: 0.38,
                metalness: 0.05
            })
        );
        body.position.z = depth * 0.2;
        this.add(body);

        highlight = new THREE.Mesh(
            new THREE.PlaneGeometry(size * 0.58, size * 0.1),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.18,
                depthTest: false,
                depthWrite: false
            })
        );
        highlight.position.set(-size * 0.02, size * 0.24, depth * 1.32);
        highlight.renderOrder = 8;
        this.add(highlight);
    }
}
