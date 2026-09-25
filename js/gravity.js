import * as THREE from 'three';

const DIRECTIONS = [
    { name: 'DOWN',     vector: new THREE.Vector3(0, -1, 0),  key: '1' },
    { name: 'UP',       vector: new THREE.Vector3(0, 1, 0),   key: '2' },
    { name: 'LEFT',     vector: new THREE.Vector3(-1, 0, 0),  key: '3' },
    { name: 'RIGHT',    vector: new THREE.Vector3(1, 0, 0),   key: '4' },
    { name: 'FORWARD',  vector: new THREE.Vector3(0, 0, -1),  key: '5' },
    { name: 'BACKWARD', vector: new THREE.Vector3(0, 0, 1),   key: '6' },
];

export class GravitySystem {
    constructor() {
        this.currentIndex = 0; // DOWN
        this.currentGravity = DIRECTIONS[0].vector.clone();
        this.targetGravity = null;
        this.previousGravity = null;
        this.transitioning = false;
        this.transitionProgress = 0;
        this.transitionDuration = 0.5; // seconds
        this.startQuaternion = new THREE.Quaternion();
        this.endQuaternion = new THREE.Quaternion();
        this.currentQuaternion = new THREE.Quaternion();
        this.strength = 9.81;
        this.callbacks = [];
    }

    switchTo(dirIndex) {
        if (dirIndex === this.currentIndex || this.transitioning) {return;}
        if (dirIndex < 0 || dirIndex >= DIRECTIONS.length) {return;}

        this.transitioning = true;
        this.transitionProgress = 0;
        this.previousGravity = this.currentGravity.clone();
        this.targetGravity = DIRECTIONS[dirIndex].vector.clone();
        this.startQuaternion.copy(this.currentQuaternion);

        // Compute the rotation quaternion that maps old gravity direction to new
        const fromDir = this.currentGravity.clone().normalize();
        const toDir = this.targetGravity.clone().normalize();
        const rotQuat = new THREE.Quaternion().setFromUnitVectors(fromDir, toDir);
        this.endQuaternion.copy(this.startQuaternion).premultiply(rotQuat);

        this.currentIndex = dirIndex;

        for (const cb of this.callbacks) {
            cb(DIRECTIONS[dirIndex]);
        }
    }

    update(delta) {
        if (!this.transitioning) {return;}

        this.transitionProgress += delta / this.transitionDuration;

        if (this.transitionProgress >= 1.0) {
            this.transitionProgress = 1.0;
            this.transitioning = false;
            this.currentGravity.copy(this.targetGravity);
            this.currentQuaternion.copy(this.endQuaternion);
            this.previousGravity = null;
            this.targetGravity = null;
        } else {
            // Cubic ease-out: t = 1 - (1 - p)^3
            const t = 1 - Math.pow(1 - this.transitionProgress, 3);

            // Slerp quaternion
            this.currentQuaternion.copy(this.startQuaternion).slerp(this.endQuaternion, t);

            // Interpolate gravity vector smoothly
            this.currentGravity.copy(this.previousGravity).lerp(this.targetGravity, t).normalize().multiplyScalar(
                this.previousGravity.length() * (1 - t) + this.targetGravity.length() * t
            );
            // Since both are unit vectors, just normalize
            this.currentGravity.copy(this.previousGravity).lerp(this.targetGravity, t);
            // The lerp of two unit vectors isn't unit, but for gravity we want magnitude 1
            if (this.currentGravity.length() > 0) {
                this.currentGravity.normalize();
            }
        }
    }

    getCurrentGravity() {
        return this.currentGravity.clone();
    }

    getCurrentUp() {
        return this.currentGravity.clone().negate();
    }

    isTransitioning() {
        return this.transitioning;
    }

    getDirectionName() {
        return DIRECTIONS[this.currentIndex].name;
    }

    getDirectionColor() {
        const colors = {
            DOWN: '#00f0ff',
            UP: '#ff006e',
            LEFT: '#39ff14',
            RIGHT: '#ffd700',
            FORWARD: '#7b2fff',
            BACKWARD: '#ff6b35',
        };
        return colors[DIRECTIONS[this.currentIndex].name];
    }

    getQuaternion() {
        return this.currentQuaternion.clone();
    }

    onSwitch(callback) {
        this.callbacks.push(callback);
    }
}

export { DIRECTIONS };
