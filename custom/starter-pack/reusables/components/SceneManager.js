export class SceneManager {
    constructor(scene, renderer) {
        this.scene = scene;
        this.renderer = renderer;
        this.objects = [];
    }

    addObject(object) {
        this.scene.add(object);
        this.objects.push(object);
        return object;
    }

    removeObject(object) {
        this.scene.remove(object);
        this.objects = this.objects.filter(function (o) {
            return o !== object;
        });
    }

    update(delta) {
        this.objects.forEach(function (obj) {
            if (obj.update) {
                obj.update(delta);
            }
        });
    }

    render(camera) {
        this.renderer.render(this.scene, camera);
    }
}
