import * as THREE from 'three';

export class SnapSystem {
    constructor() {
        this.snapDistance = 0.3;   // position threshold
        this.snapAngle = 10;       // degrees tolerance
        this.onSnapCallbacks = [];
        this.activeAnimations = [];
    }

    /**
     * Check if a piece is close enough to its matching target.
     * @param {THREE.Vector3} piecePos
     * @param {THREE.Vector3} targetPos
     * @param {string} pieceType - e.g. 'tetra', 'cube', 'dodeca'
     * @param {string} targetType
     * @returns {'PERFECT'|'CLOSE'|'WRONG_TYPE'|'NONE'}
     */
    checkFit(piecePos, targetPos, pieceType, targetType) {
        if (pieceType !== targetType) return 'WRONG_TYPE';

        const dist = piecePos.distanceTo(targetPos);
        if (dist < this.snapDistance) return 'PERFECT';
        if (dist < this.snapDistance * 3) return 'CLOSE';
        return 'NONE';
    }

    /**
     * Get a 0-1 proximity value (1 = very close, 0 = far away).
     * @param {THREE.Vector3} piecePos
     * @param {THREE.Vector3} targetPos
     * @returns {number}
     */
    getProximity(piecePos, targetPos) {
        const dist = piecePos.distanceTo(targetPos);
        const maxDist = this.snapDistance * 5;
        return Math.max(0, 1 - dist / maxDist);
    }

    /**
     * Create an animation that snaps a piece mesh to a target position
     * with elastic ease-out and bounce scale.
     * @param {THREE.Mesh} pieceMesh
     * @param {THREE.Vector3} targetPos
     * @param {number} duration - seconds
     * @returns {{ update: (delta: number) => boolean, done: boolean }}
     */
    createSnapAnimation(pieceMesh, targetPos, duration = 0.3) {
        const startPos = pieceMesh.position.clone();
        const targetPosition = targetPos.clone();
        let elapsed = 0;

        const animation = {
            update(delta) {
                elapsed += delta;
                const t = Math.min(elapsed / duration, 1);

                // Elastic ease-out
                let elastic;
                if (t === 0) {
                    elastic = 0;
                } else if (t === 1) {
                    elastic = 1;
                } else {
                    elastic = 1 - Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * (2 * Math.PI) / 3);
                }

                // Interpolate position with elastic easing
                pieceMesh.position.lerpVectors(startPos, targetPosition, elastic);

                // Bounce scale effect: peaks mid-animation, settles to 1
                const scaleBounce = 1 + 0.3 * Math.sin(t * Math.PI) * (1 - t);
                pieceMesh.scale.set(scaleBounce, scaleBounce, scaleBounce);

                return t >= 1;
            },
            get done() {
                return elapsed >= duration;
            },
        };

        this.activeAnimations.push(animation);
        return animation;
    }

    /**
     * Attempt to snap a piece to a matching target. If fit is PERFECT,
     * creates the snap animation and notifies callbacks.
     * @param {object} piece - { mesh, vertex, type, placed, carried }
     * @param {object} target - { mesh, vertex, type, filled }
     * @returns {object|null} The animation object if snapped, null otherwise
     */
    trySnap(piece, target) {
        const fit = this.checkFit(
            piece.mesh.position,
            target.mesh.position,
            piece.type,
            target.type
        );

        if (fit === 'PERFECT') {
            const anim = this.createSnapAnimation(
                piece.mesh,
                target.mesh.position.clone()
            );
            piece.placed = true;
            piece.carried = false;
            piece.vertex = target.vertex;
            target.filled = true;
            this._notifySnap(piece, target);
            return anim;
        }

        return null;
    }

    /**
     * Update all active snap animations. Call once per frame.
     * @param {number} delta - frame delta time in seconds
     */
    updateAnimations(delta) {
        for (let i = this.activeAnimations.length - 1; i >= 0; i--) {
            const finished = this.activeAnimations[i].update(delta);
            if (finished) {
                this.activeAnimations.splice(i, 1);
            }
        }
    }

    /**
     * Check if any snap animations are currently playing.
     * @returns {boolean}
     */
    hasActiveAnimations() {
        return this.activeAnimations.length > 0;
    }

    /**
     * Register a callback for snap events.
     * @param {function} callback - (piece, target) => void
     */
    onSnap(callback) {
        this.onSnapCallbacks.push(callback);
    }

    /**
     * Notify all registered callbacks of a snap event.
     * @param {object} piece
     * @param {object} target
     */
    _notifySnap(piece, target) {
        for (const cb of this.onSnapCallbacks) {
            cb(piece, target);
        }
    }
}
