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
        bevelSegments: 5,
        bevelSize: radius * 0.28,
        bevelThickness: radius * 0.28,
        steps: 1
    });
}

function createShooterMaterial(color, roughness, metalness) {
    return new THREE.MeshStandardMaterial({
        color: new THREE.Color(color),
        roughness: roughness,
        metalness: metalness
    });
}

function getLightColor(color) {
    return new THREE.Color(color).lerp(new THREE.Color(0xffffff), 0.24);
}

function createNumberSprite(number) {
    var size = 256;
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    var texture;
    var material;

    canvas.width = size;
    canvas.height = size;

    ctx.clearRect(0, 0, size, size);
    ctx.font = 'bold 150px Arial';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = 18;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.75)';
    ctx.strokeText(String(number), size * 0.5, size * 0.52);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(String(number), size * 0.5, size * 0.52);

    texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;

    material = new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthTest: false,
        depthWrite: false
    });

    return new THREE.Sprite(material);
}

export class Shooter3D extends THREE.Group {
    constructor(options) {
        super();

        var opts = options || {};
        var number = typeof opts.number === 'number' ? opts.number : 9;
        var width = opts.width || 1;
        var height = opts.height || 1;
        var depth = opts.depth || 0.34;
        var color = opts.color || '#22e51f';
        var darkColor = opts.darkColor || '#0fa80f';
        var lightColor = getLightColor(color);
        var rimColor = opts.rimColor || '#5f6b84';
        var portColor = opts.portColor || '#063808';
        var rim;
        var body;
        var face;
        var neck;
        var barrel;
        var barrelLip;
        var port;
        var highlight;
        var nozzleHighlight;
        var label;
        var portY;
        var portZ = depth * 0.28;
        var barrelY = -height * 0.58;
        var barrelLength = height * 0.22;
        var lipThickness = width * 0.055;

        this.number = number;
        this.labelDepth = depth * 1.3;
        this.labelScale = {
            x: width * 0.56,
            y: height * 0.56
        };
        this.labelPosition = {
            x: 0,
            y: height * 0.04
        };
        portY = barrelY - (barrelLength * 0.5) - 0.006;
        this.muzzleLocalPosition = new THREE.Vector3(0, portY - (width * 0.02), portZ);

        rim = new THREE.Mesh(
            createRoundedBox(width * 1.12, height * 1.06, depth * 0.36, width * 0.2),
            createShooterMaterial(rimColor, 0.56, 0.08)
        );
        rim.position.set(0, -height * 0.03, -depth * 0.08);
        rim.userData.shooterPart = true;
        this.add(rim);

        body = new THREE.Mesh(
            createRoundedBox(width, height, depth, width * 0.18),
            createShooterMaterial(color, 0.28, 0.07)
        );
        body.position.z = depth * 0.08;
        body.userData.shooterPart = true;
        this.add(body);

        face = new THREE.Mesh(
            createRoundedBox(width * 0.78, height * 0.68, depth * 0.08, width * 0.14),
            createShooterMaterial(lightColor, 0.24, 0.04)
        );
        face.position.set(0, height * 0.07, depth * 0.48);
        face.userData.shooterPart = true;
        this.add(face);

        neck = new THREE.Mesh(
            new THREE.CylinderGeometry(width * 0.34, width * 0.4, height * 0.12, 48),
            createShooterMaterial(darkColor, 0.34, 0.05)
        );
        neck.position.set(0, -height * 0.48, depth * 0.27);
        neck.userData.shooterPart = true;
        this.add(neck);

        barrel = new THREE.Mesh(
            new THREE.CylinderGeometry(width * 0.24, width * 0.31, barrelLength, 56),
            createShooterMaterial(darkColor, 0.3, 0.05)
        );
        barrel.position.set(0, barrelY, portZ);
        barrel.userData.shooterPart = true;
        this.add(barrel);

        barrelLip = new THREE.Mesh(
            new THREE.CylinderGeometry(width * 0.23, width * 0.23, lipThickness, 48),
            createShooterMaterial(lightColor, 0.25, 0.04)
        );
        barrelLip.position.set(0, portY + (lipThickness * 0.5), portZ);
        barrelLip.userData.shooterPart = true;
        this.add(barrelLip);

        port = new THREE.Mesh(
            new THREE.CylinderGeometry(width * 0.145, width * 0.145, lipThickness * 0.38, 48),
            new THREE.MeshBasicMaterial({
                color: new THREE.Color(portColor)
            })
        );
        port.position.set(0, portY - (lipThickness * 0.2), portZ);
        port.userData.shooterPart = true;
        this.add(port);

        highlight = new THREE.Mesh(
            new THREE.PlaneGeometry(width * 0.62, height * 0.16),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.28,
                depthTest: false,
                depthWrite: false
            })
        );
        highlight.position.set(0, height * 0.24, depth * 1.26);
        highlight.renderOrder = 8;
        this.add(highlight);

        nozzleHighlight = new THREE.Mesh(
            new THREE.PlaneGeometry(width * 0.22, height * 0.05),
            new THREE.MeshBasicMaterial({
                color: 0xffffff,
                transparent: true,
                opacity: 0.18,
                depthTest: false,
                depthWrite: false
            })
        );
        nozzleHighlight.position.set(0, -height * 0.53, depth * 0.58);
        this.add(nozzleHighlight);

        label = createNumberSprite(number);
        label.position.set(this.labelPosition.x, this.labelPosition.y, this.labelDepth);
        label.scale.set(this.labelScale.x, this.labelScale.y, 1);
        label.renderOrder = 20;
        this.add(label);
    }

    setNumber(value) {
        var oldLabel = this.children.find(function (child) {
            return child.isSprite;
        });
        var newLabel;

        this.number = value;

        if (oldLabel) {
            this.remove(oldLabel);
        }

        newLabel = createNumberSprite(value);
        newLabel.position.set(this.labelPosition.x, this.labelPosition.y, this.labelDepth);
        newLabel.scale.set(this.labelScale.x, this.labelScale.y, 1);
        newLabel.renderOrder = 20;
        this.add(newLabel);
    }

    getMuzzleWorldPosition(target) {
        var position = target || new THREE.Vector3();

        return this.localToWorld(position.copy(this.muzzleLocalPosition));
    }
}
