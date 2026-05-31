import * as THREE from 'three';

export class SceneSetup {
    static configureRenderer(renderer) {
        renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
        renderer.setSize(window.innerWidth, window.innerHeight);

        if ('outputColorSpace' in renderer && THREE.SRGBColorSpace) {
            renderer.outputColorSpace = THREE.SRGBColorSpace;
        } else if ('outputEncoding' in renderer && THREE.sRGBEncoding) {
            renderer.outputEncoding = THREE.sRGBEncoding;
        }
    }

    static calculateBackgroundSize(backgroundConfig) {
        var aspectRatio = backgroundConfig.sourceWidth / backgroundConfig.sourceHeight;
        var worldHeight = backgroundConfig.worldHeight;

        return {
            width: worldHeight * aspectRatio,
            height: worldHeight
        };
    }

    static fitOrthographicCamera(camera, backgroundSize) {
        var aspect = window.innerWidth / window.innerHeight;
        var targetAspect = backgroundSize.width / backgroundSize.height;

        if (aspect > targetAspect) {
            camera.top = backgroundSize.height * 0.5;
            camera.bottom = -backgroundSize.height * 0.5;
            camera.right = camera.top * aspect;
            camera.left = -camera.right;
        } else {
            camera.right = backgroundSize.width * 0.5;
            camera.left = -camera.right;
            camera.top = camera.right / aspect;
            camera.bottom = -camera.top;
        }

        camera.near = 0.1;
        camera.far = 20;
        camera.position.set(0, 0, 10);
        camera.lookAt(0, 0, 0);
        camera.updateProjectionMatrix();
    }
}
