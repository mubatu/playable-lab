var THREE = window.THREE;

if (!THREE) {
    throw new Error('The global THREE namespace is missing. Make sure three.min.js loads before module imports.');
}

export var AmbientLight = THREE.AmbientLight;
export var Box3 = THREE.Box3;
export var BoxGeometry = THREE.BoxGeometry;
export var Clock = THREE.Clock;
export var Color = THREE.Color;
export var DirectionalLight = THREE.DirectionalLight;
export var Group = THREE.Group;
export var LinearFilter = THREE.LinearFilter;
export var Mesh = THREE.Mesh;
export var MeshBasicMaterial = THREE.MeshBasicMaterial;
export var MeshStandardMaterial = THREE.MeshStandardMaterial;
export var OrthographicCamera = THREE.OrthographicCamera;
export var Plane = THREE.Plane;
export var PlaneGeometry = THREE.PlaneGeometry;
export var PointLight = THREE.PointLight;
export var Raycaster = THREE.Raycaster;
export var Scene = THREE.Scene;
export var SphereGeometry = THREE.SphereGeometry;
export var SRGBColorSpace = THREE.SRGBColorSpace;
export var sRGBEncoding = THREE.sRGBEncoding;
export var TextureLoader = THREE.TextureLoader;
export var Vector2 = THREE.Vector2;
export var Vector3 = THREE.Vector3;
export var WebGLRenderer = THREE.WebGLRenderer;

export default THREE;
