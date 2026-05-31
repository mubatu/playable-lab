import * as THREE from 'three';

export function createGameScene() {
    let container = document.getElementById('app');
    if (!container) {
        container = document.createElement('div');
        container.id = 'app';
        document.body.appendChild(container);
    }

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x0d1018);
    container.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x0d1018, 18, 42);

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.set(0, 10, 13);
    camera.lookAt(0, 2, 0);

    const hemi = new THREE.HemisphereLight(0xffffff, 0x223344, 1.2);
    scene.add(hemi);

    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(6, 12, 8);
    scene.add(dir);

    function handleResize() {
        renderer.setSize(window.innerWidth, window.innerHeight);
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
    }

    window.addEventListener('resize', handleResize);

    return {
        container,
        renderer,
        scene,
        camera,
        handleResize
    };
}