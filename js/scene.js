import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { PALETTE } from './shaders.js';

/**
 * Initialize the complete Three.js scene with camera, renderer,
 * controls, lighting, post-processing, and resize handling.
 *
 * @returns {{
 *   scene: THREE.Scene,
 *   camera: THREE.PerspectiveCamera,
 *   renderer: THREE.WebGLRenderer,
 *   controls: OrbitControls,
 *   composer: EffectComposer,
 *   clock: THREE.Clock,
 *   playerLight: THREE.PointLight
 * }}
 */
export function initScene() {
    // ── Scene ──
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(PALETTE.BACKGROUND);
    scene.fog = new THREE.FogExp2(PALETTE.BACKGROUND, 0.04);

    // ── Camera ──
    const camera = new THREE.PerspectiveCamera(
        60,
        window.innerWidth / window.innerHeight,
        0.1,
        100
    );
    camera.position.set(0, 3, 7);

    // ── Renderer ──
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.2;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.body.appendChild(renderer.domElement);

    // ── Orbit Controls ──
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.08;
    controls.enablePan = false;
    controls.minDistance = 3;
    controls.maxDistance = 15;
    controls.autoRotate = false;

    // ── Lights ──
    const ambientLight = new THREE.AmbientLight(0x1a1a3e, 0.4);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0xffffff, 0.8);
    dirLight1.position.set(5, 8, 3);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0x4466ff, 0.4);
    dirLight2.position.set(-3, 4, -5);
    scene.add(dirLight2);

    const playerLight = new THREE.PointLight(0x00f0ff, 0.6, 20);
    playerLight.position.set(0, 0, 0);
    scene.add(playerLight);

    // ── Post-Processing ──
    const composer = new EffectComposer(renderer);

    const renderPass = new RenderPass(scene, camera);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
        new THREE.Vector2(window.innerWidth, window.innerHeight),
        0.6,   // strength
        0.4,   // radius
        0.2    // threshold
    );
    composer.addPass(bloomPass);

    // ── Clock ──
    const clock = new THREE.Clock();

    // ── Resize Handler ──
    window.addEventListener('resize', () => {
        const width = window.innerWidth;
        const height = window.innerHeight;

        camera.aspect = width / height;
        camera.updateProjectionMatrix();

        renderer.setSize(width, height);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        composer.setSize(width, height);
        bloomPass.resolution.set(width, height);
    });

    return { scene, camera, renderer, controls, composer, clock, playerLight };
}
