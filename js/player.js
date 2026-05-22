import * as THREE from 'three';
import { createRimMaterial, registerMaterial, PALETTE } from './shaders.js';

export class Player {
    constructor(scene, maze, gravitySystem) {
        this.scene = scene;
        this.maze = maze;
        this.gravity = gravitySystem;

        // Player mesh: Octahedron, low-poly
        const geo = new THREE.OctahedronGeometry(0.15, 0);
        geo.computeVertexNormals();
        this.material = createRimMaterial(PALETTE.PLAYER, PALETTE.RIM_CYAN, 2.5);
        this.material.uniforms.uRimStrength.value = 2.0;
        registerMaterial(this.material);
        this.mesh = new THREE.Mesh(geo, this.material);
        scene.add(this.mesh);

        // State
        this.currentVertex = 0;
        this.targetVertex = -1;
        this.moveProgress = 0;
        this.moveSpeed = 3.0; // units per second
        this.moving = false;
        this.carrying = null; // puzzle piece object or null

        // Trail effect
        this.trail = []; // recent positions
        this.trailLine = null; // THREE.Line
        this._createTrail();

        // Spin animation
        this.spinSpeed = 1.5;

        // Position at starting vertex
        this._updatePosition();
    }

    _createTrail() {
        const maxPoints = 50;
        const geometry = new THREE.BufferGeometry();
        const positions = new Float32Array(maxPoints * 3);
        geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        geometry.setDrawRange(0, 0);
        const material = new THREE.LineBasicMaterial({
            color: PALETTE.PLAYER,
            transparent: true,
            opacity: 0.4
        });
        this.trailLine = new THREE.Line(geometry, material);
        this.scene.add(this.trailLine);
        this.trailMaxPoints = maxPoints;
    }

    _updatePosition() {
        const pos = this.maze.getVertexPosition(this.currentVertex);
        this.mesh.position.copy(pos);
    }

    moveToward(inputDirection, camera) {
        // inputDirection is a normalized THREE.Vector3 in screen-relative space
        // Convert to world space using camera orientation
        // Find the adjacent vertex whose direction from current best matches inputDirection
        // Start moving toward it

        if (this.moving) return false;

        const currentPos = this.maze.getVertexPosition(this.currentVertex);
        const adjacent = this.maze.getAdjacentVertices(this.currentVertex);

        if (adjacent.length === 0) return false;

        // Transform input direction by camera orientation
        const cameraDir = new THREE.Vector3();
        camera.getWorldDirection(cameraDir);
        const cameraRight = new THREE.Vector3()
            .crossVectors(cameraDir, new THREE.Vector3(0, 1, 0))
            .normalize();
        const cameraForward = new THREE.Vector3()
            .crossVectors(new THREE.Vector3(0, 1, 0), cameraRight)
            .normalize();

        const worldDir = new THREE.Vector3()
            .addScaledVector(cameraRight, inputDirection.x)
            .addScaledVector(new THREE.Vector3(0, 1, 0), inputDirection.y)
            .addScaledVector(cameraForward, inputDirection.z)
            .normalize();

        // Find best matching adjacent vertex
        let bestVertex = -1;
        let bestDot = -Infinity;

        for (const adjIdx of adjacent) {
            const adjPos = this.maze.getVertexPosition(adjIdx);
            const dir = new THREE.Vector3().subVectors(adjPos, currentPos).normalize();
            const dot = dir.dot(worldDir);
            if (dot > bestDot && dot > 0.2) {
                bestDot = dot;
                bestVertex = adjIdx;
            }
        }

        if (bestVertex < 0) return false;

        this.targetVertex = bestVertex;
        this.moveProgress = 0;
        this.moving = true;
        return true;
    }

    interact() {
        // If carrying a piece, try to place it at current vertex
        // If not carrying, try to pick up a piece at current vertex

        if (this.moving) return null;

        if (this.carrying) {
            // Try to place
            return { action: 'place', vertex: this.currentVertex, piece: this.carrying };
        } else {
            // Try to pick up
            for (const piece of this.maze.puzzlePieces) {
                if (!piece.placed && !piece.carried && piece.vertex === this.currentVertex) {
                    piece.carried = true;
                    this.carrying = piece;
                    return { action: 'pickup', piece };
                }
            }
        }
        return null;
    }

    update(delta) {
        // Spin animation
        this.mesh.rotation.y += this.spinSpeed * delta;
        this.mesh.rotation.x += this.spinSpeed * 0.3 * delta;

        // Movement
        if (this.moving) {
            const startPos = this.maze.getVertexPosition(this.currentVertex);
            const endPos = this.maze.getVertexPosition(this.targetVertex);
            const distance = startPos.distanceTo(endPos);

            this.moveProgress += (this.moveSpeed * delta) / Math.max(distance, 0.01);

            if (this.moveProgress >= 1.0) {
                this.moveProgress = 1.0;
                this.currentVertex = this.targetVertex;
                this.targetVertex = -1;
                this.moving = false;
            }

            // Smooth ease-in-out (smoothstep)
            const t = this.moveProgress;
            const smooth = t * t * (3 - 2 * t);

            this.mesh.position.lerpVectors(startPos, endPos, smooth);
        } else {
            this._updatePosition();
        }

        // Update carried piece position
        if (this.carrying) {
            const offset = new THREE.Vector3(0, 0.25, 0);
            this.carrying.mesh.position.copy(this.mesh.position).add(offset);
            this.carrying.mesh.rotation.y += delta * 2;
        }

        // Update trail
        this.trail.push(this.mesh.position.clone());
        if (this.trail.length > this.trailMaxPoints) this.trail.shift();

        const positions = this.trailLine.geometry.attributes.position.array;
        for (let i = 0; i < this.trail.length; i++) {
            positions[i * 3] = this.trail[i].x;
            positions[i * 3 + 1] = this.trail[i].y;
            positions[i * 3 + 2] = this.trail[i].z;
        }
        this.trailLine.geometry.attributes.position.needsUpdate = true;
        this.trailLine.geometry.setDrawRange(0, this.trail.length);

        // Glow effect
        this.material.uniforms.uGlow.value = 1.0;
    }

    // Apply gravity: slide player along edges in gravity direction
    applyGravity(gravityDir) {
        if (this.moving) return;

        const currentPos = this.maze.getVertexPosition(this.currentVertex);
        const adjacent = this.maze.getAdjacentVertices(this.currentVertex);

        let bestVertex = -1;
        let bestDot = -Infinity;

        for (const adjIdx of adjacent) {
            const adjPos = this.maze.getVertexPosition(adjIdx);
            const dir = new THREE.Vector3().subVectors(adjPos, currentPos).normalize();
            const dot = dir.dot(gravityDir);
            if (dot > bestDot && dot > 0.5) {
                bestDot = dot;
                bestVertex = adjIdx;
            }
        }

        if (bestVertex >= 0) {
            this.targetVertex = bestVertex;
            this.moveProgress = 0;
            this.moving = true;
        }
    }
}
