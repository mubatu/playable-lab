import * as THREE from 'three';

export class TextureUtils {
    static setColorSpace(texture) {
        texture.minFilter = THREE.LinearFilter;
        texture.magFilter = THREE.LinearFilter;

        if ('colorSpace' in texture && THREE.SRGBColorSpace) {
            texture.colorSpace = THREE.SRGBColorSpace;
        } else if ('encoding' in texture && THREE.sRGBEncoding) {
            texture.encoding = THREE.sRGBEncoding;
        }
    }

    static load(path) {
        return new Promise(function (resolve, reject) {
            var loader = new THREE.TextureLoader();
            loader.load(
                path,
                function (texture) {
                    TextureUtils.setColorSpace(texture);
                    resolve(texture);
                },
                undefined,
                function () {
                    reject(new Error('Could not load texture: ' + path));
                }
            );
        });
    }

    static loadAll(paths) {
        return Promise.all(paths.map(function (path) {
            return TextureUtils.load(path);
        }));
    }
}
