import * as THREE from 'three';

// ── Shared vertex shader ──
const rimVertexShader = `
    varying vec3 vViewPosition;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
        vWorldPosition = (modelMatrix * vec4(position, 1.0)).xyz;
        gl_Position = projectionMatrix * mvPosition;
    }
`;

// ── Rim-lit flat-shaded fragment shader ──
const rimFragmentShader = `
    uniform vec3 uBaseColor;
    uniform vec3 uRimColor;
    uniform float uRimPower;
    uniform float uRimStrength;
    uniform vec3 uLightDir1;
    uniform vec3 uLightDir2;
    uniform float uTime;
    uniform float uGlow;

    varying vec3 vViewPosition;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        // Flat shading via screen-space derivatives
        vec3 fdx = dFdx(vViewPosition);
        vec3 fdy = dFdy(vViewPosition);
        vec3 normal = normalize(cross(fdx, fdy));

        // Dual directional lights
        vec3 light1 = normalize(uLightDir1);
        vec3 light2 = normalize(uLightDir2);
        float diffuse1 = max(dot(normal, light1), 0.0);
        float diffuse2 = max(dot(normal, light2), 0.0) * 0.5;
        float diffuse = diffuse1 + diffuse2;

        // Hard-edge cel shading
        diffuse = smoothstep(0.0, 0.05, diffuse);
        vec3 diffuseColor = uBaseColor * (0.25 + 0.75 * diffuse);

        // Rim lighting
        vec3 viewDir = normalize(vViewPosition);
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        rim = pow(clamp(rim, 0.0, 1.0), uRimPower);
        vec3 rimLight = uRimColor * rim * uRimStrength;

        // Glow pulse
        float glowPulse = 1.0 + uGlow * 0.3 * sin(uTime * 3.0);

        vec3 finalColor = (diffuseColor + rimLight) * glowPulse;
        gl_FragColor = vec4(finalColor, 1.0);
    }
`;

// ── Ghost fragment shader (translucent pulsing) ──
const ghostFragmentShader = `
    uniform vec3 uBaseColor;
    uniform vec3 uRimColor;
    uniform float uRimPower;
    uniform float uTime;

    varying vec3 vViewPosition;
    varying vec3 vWorldNormal;
    varying vec3 vWorldPosition;

    void main() {
        vec3 fdx = dFdx(vViewPosition);
        vec3 fdy = dFdy(vViewPosition);
        vec3 normal = normalize(cross(fdx, fdy));
        vec3 viewDir = normalize(vViewPosition);
        float rim = 1.0 - max(dot(viewDir, normal), 0.0);
        rim = pow(clamp(rim, 0.0, 1.0), uRimPower);
        float pulse = 0.4 + 0.2 * sin(uTime * 2.0);
        vec3 color = uBaseColor * 0.3 + uRimColor * rim;
        gl_FragColor = vec4(color, pulse * rim + 0.1);
    }
`;

// ── Internal array of all managed materials ──
const managedMaterials = [];

/**
 * Register a material for automatic time-uniform updates.
 */
export function registerMaterial(material) {
    managedMaterials.push(material);
}

/**
 * Update the uTime uniform on all managed materials.
 */
export function updateMaterials(time) {
    for (let i = 0; i < managedMaterials.length; i++) {
        const mat = managedMaterials[i];
        if (mat.uniforms && mat.uniforms.uTime) {
            mat.uniforms.uTime.value = time;
        }
    }
}

/**
 * Create a rim-lit flat-shaded ShaderMaterial.
 * @param {number} baseColor - Hex color for the base surface.
 * @param {number} rimColor - Hex color for the rim glow.
 * @param {number} [rimPower=3.0] - Exponent controlling rim falloff.
 * @returns {THREE.ShaderMaterial}
 */
export function createRimMaterial(baseColor, rimColor, rimPower = 3.0) {
    const material = new THREE.ShaderMaterial({
        vertexShader: rimVertexShader,
        fragmentShader: rimFragmentShader,
        uniforms: {
            uBaseColor: { value: new THREE.Color(baseColor) },
            uRimColor: { value: new THREE.Color(rimColor) },
            uRimPower: { value: rimPower },
            uRimStrength: { value: 1.0 },
            uLightDir1: { value: new THREE.Vector3(5, 8, 3).normalize() },
            uLightDir2: { value: new THREE.Vector3(-3, 4, -5).normalize() },
            uTime: { value: 0.0 },
            uGlow: { value: 0.0 },
        },
    });

    registerMaterial(material);
    return material;
}

/**
 * Create a translucent ghost ShaderMaterial with pulsing rim.
 * @param {number} baseColor - Hex color for the ghost base.
 * @param {number} [rimColor=0xffffff] - Hex color for the ghost rim.
 * @returns {THREE.ShaderMaterial}
 */
export function createGhostMaterial(baseColor, rimColor = 0xffffff) {
    const material = new THREE.ShaderMaterial({
        vertexShader: rimVertexShader,
        fragmentShader: ghostFragmentShader,
        uniforms: {
            uBaseColor: { value: new THREE.Color(baseColor) },
            uRimColor: { value: new THREE.Color(rimColor) },
            uRimPower: { value: 2.5 },
            uTime: { value: 0.0 },
        },
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    });

    registerMaterial(material);
    return material;
}

/**
 * Create a LineBasicMaterial for glowing edges.
 * @param {number} color - Hex color for the line.
 * @param {number} [opacity=1.0] - Opacity of the line.
 * @returns {THREE.LineBasicMaterial}
 */
export function createEdgeGlowMaterial(color, opacity = 1.0) {
    return new THREE.LineBasicMaterial({
        color: new THREE.Color(color),
        transparent: opacity < 1.0,
        opacity: opacity,
    });
}

// ── Color Palette ──
export const PALETTE = {
    BACKGROUND: 0x0a0a1a,
    MAZE_CORRIDOR: 0x1a1a2e,
    RIM_CYAN: 0x00f0ff,
    PLAYER: 0xff006e,
    PIECE_1: 0x39ff14,
    PIECE_2: 0xffd700,
    PIECE_3: 0x7b2fff,
    NODE_ACTIVE: 0x16213e,
    NODE_RIM: 0x00f0ff,
    WIREFRAME_DIM: 0x0a2a3a,
    GRAVITY_COLORS: {
        DOWN: '#00f0ff',
        UP: '#ff006e',
        LEFT: '#39ff14',
        RIGHT: '#ffd700',
        FORWARD: '#7b2fff',
        BACKWARD: '#ff6b35',
    },
};
