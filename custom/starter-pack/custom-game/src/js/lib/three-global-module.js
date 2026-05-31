const THREE = window.THREE;

if (!THREE) {
  throw new Error('window.THREE is missing. Load reusables/vendor/three.min.js first.');
}

export const AmbientLight = THREE.AmbientLight;
export const BoxGeometry = THREE.BoxGeometry;
export const Color = THREE.Color;
export const DirectionalLight = THREE.DirectionalLight;
export const Mesh = THREE.Mesh;
export const MeshStandardMaterial = THREE.MeshStandardMaterial;
export const PerspectiveCamera = THREE.PerspectiveCamera;
export const Scene = THREE.Scene;
export const WebGLRenderer = THREE.WebGLRenderer;

export default THREE;
