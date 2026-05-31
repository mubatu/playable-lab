import * as THREE from 'three';

export class DragController {
    constructor(config) {
        this.renderer = config.renderer;
        this.camera = config.camera;
        this.targetGroup = config.targetGroup;
        this.dragPlane = config.dragPlane || new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        this.dragZ = typeof config.dragZ === 'number' ? config.dragZ : 0.45;
        this.dragScale = typeof config.dragScale === 'number' ? config.dragScale : 1;
        this.cursorIdle = config.cursorIdle || 'grab';
        this.cursorActive = config.cursorActive || 'grabbing';

        this.onDragStart = config.onDragStart || null;
        this.onDragMove = config.onDragMove || null;
        this.onDragEnd = config.onDragEnd || null;

        this.raycaster = new THREE.Raycaster();
        this.drag = null;

        this._onPointerDown = this._onPointerDown.bind(this);
        this._onPointerMove = this._onPointerMove.bind(this);
        this._onPointerUp = this._onPointerUp.bind(this);
    }

    bind() {
        var canvas = this.renderer.domElement;

        canvas.addEventListener('pointerdown', this._onPointerDown);
        canvas.addEventListener('pointermove', this._onPointerMove);
        canvas.addEventListener('pointerup', this._onPointerUp);
        canvas.addEventListener('pointercancel', this._onPointerUp);
        window.addEventListener('pointerup', this._onPointerUp);
        window.addEventListener('pointercancel', this._onPointerUp);
    }

    unbind() {
        var canvas = this.renderer.domElement;

        canvas.removeEventListener('pointerdown', this._onPointerDown);
        canvas.removeEventListener('pointermove', this._onPointerMove);
        canvas.removeEventListener('pointerup', this._onPointerUp);
        canvas.removeEventListener('pointercancel', this._onPointerUp);
        window.removeEventListener('pointerup', this._onPointerUp);
        window.removeEventListener('pointercancel', this._onPointerUp);
    }

    destroy() {
        this.unbind();
        this.drag = null;
    }

    getWorldPoint(event) {
        var rect = this.renderer.domElement.getBoundingClientRect();
        var pointer = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -(((event.clientY - rect.top) / rect.height) * 2 - 1)
        );
        var worldPoint = new THREE.Vector3();

        this.raycaster.setFromCamera(pointer, this.camera);

        if (!this.raycaster.ray.intersectPlane(this.dragPlane, worldPoint)) {
            return null;
        }

        return worldPoint;
    }

    _setPointerCapture(pointerId) {
        var canvas = this.renderer.domElement;

        if (canvas.setPointerCapture) {
            canvas.setPointerCapture(pointerId);
        }
    }

    _releasePointerCapture(pointerId) {
        var canvas = this.renderer.domElement;

        if (canvas.hasPointerCapture && canvas.hasPointerCapture(pointerId) && canvas.releasePointerCapture) {
            canvas.releasePointerCapture(pointerId);
        }
    }

    _setCursor(cursor) {
        this.renderer.domElement.style.cursor = cursor;
    }

    _onPointerDown(event) {
        var rect;
        var pointer;
        var intersections;
        var hitObject;
        var worldPoint;

        if (this.drag) {
            return;
        }

        rect = this.renderer.domElement.getBoundingClientRect();
        pointer = new THREE.Vector2(
            ((event.clientX - rect.left) / rect.width) * 2 - 1,
            -(((event.clientY - rect.top) / rect.height) * 2 - 1)
        );

        this.raycaster.setFromCamera(pointer, this.camera);
        intersections = this.raycaster.intersectObjects(this.targetGroup.children, false);

        if (!intersections.length) {
            return;
        }

        hitObject = intersections[0].object;
        worldPoint = this.getWorldPoint(event);

        if (!worldPoint) {
            return;
        }

        this.drag = {
            object: hitObject,
            offsetX: worldPoint.x - hitObject.position.x,
            offsetY: worldPoint.y - hitObject.position.y,
            startPosition: hitObject.position.clone(),
            startScale: hitObject.scale.clone(),
            pointerId: event.pointerId
        };

        hitObject.position.z = this.dragZ;

        if (this.dragScale !== 1) {
            hitObject.scale.setScalar(this.dragScale);
        }

        this._setPointerCapture(event.pointerId);
        this._setCursor(this.cursorActive);

        if (this.onDragStart) {
            this.onDragStart(hitObject, event);
        }
    }

    _onPointerMove(event) {
        var worldPoint;

        if (!this.drag || event.pointerId !== this.drag.pointerId) {
            return;
        }

        worldPoint = this.getWorldPoint(event);

        if (!worldPoint) {
            return;
        }

        this.drag.object.position.set(
            worldPoint.x - this.drag.offsetX,
            worldPoint.y - this.drag.offsetY,
            this.dragZ
        );

        if (this.onDragMove) {
            this.onDragMove(this.drag.object, worldPoint);
        }
    }

    _onPointerUp(event) {
        var draggedObject;
        var worldPoint;

        if (!this.drag || event.pointerId !== this.drag.pointerId) {
            return;
        }

        draggedObject = this.drag.object;
        worldPoint = this.getWorldPoint(event);

        this._releasePointerCapture(event.pointerId);
        this._setCursor(this.cursorIdle);

        if (this.onDragEnd) {
            this.onDragEnd(draggedObject, worldPoint, this.drag);
        }

        this.drag = null;
    }
}
