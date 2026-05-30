var THREE = window.THREE;

if (!THREE) {
    throw new Error('The global THREE namespace is missing. Make sure three.min.js loads before module imports.');
}

export var AmbientLight = THREE.AmbientLight;
export var BoxGeometry = THREE.BoxGeometry;
export var CanvasTexture = THREE.CanvasTexture;
export var Clock = THREE.Clock;
export var Color = THREE.Color;
export var CylinderGeometry = THREE.CylinderGeometry;
export var DirectionalLight = THREE.DirectionalLight;
export var DoubleSide = THREE.DoubleSide;
export var ExtrudeGeometry = THREE.ExtrudeGeometry;
export var Group = THREE.Group;
export var LinearFilter = THREE.LinearFilter;
export var Mesh = THREE.Mesh;
export var MeshBasicMaterial = THREE.MeshBasicMaterial;
export var MeshStandardMaterial = THREE.MeshStandardMaterial;
export var OrthographicCamera = THREE.OrthographicCamera;
export var PlaneGeometry = THREE.PlaneGeometry;
export var Raycaster = THREE.Raycaster;
export var Scene = THREE.Scene;
export var Shape = THREE.Shape;
export var ShapeGeometry = THREE.ShapeGeometry;
export var SphereGeometry = THREE.SphereGeometry;
export var Sprite = THREE.Sprite;
export var SpriteMaterial = THREE.SpriteMaterial;
export var SRGBColorSpace = THREE.SRGBColorSpace;
export var sRGBEncoding = THREE.sRGBEncoding;
export var Vector2 = THREE.Vector2;
export var Vector3 = THREE.Vector3;
export var WebGLRenderer = THREE.WebGLRenderer;

export default THREE;
