import * as THREE from 'three';
import { createRimMaterial, createGhostMaterial, createEdgeGlowMaterial, registerMaterial, PALETTE } from './shaders.js';

export class TesseractMaze {
    constructor(scene) {
        this.scene = scene;
        this.vertices4D = [];
        this.allEdges = [];
        this.mazeEdges = [];
        this.projected = [];

        this.angleXW = 0;
        this.angleYW = 0;
        this.autoRotateSpeed = 0.1;

        this.group = new THREE.Group();
        this.vertexMeshes = [];
        this.edgeMeshes = [];
        this.wireframe = null;

        this.puzzlePieces = [];
        this.targets = [];

        this._generate();
        this._createMeshes();
        this._setupPuzzle();
        scene.add(this.group);
    }

    _generate() {
        // 1. Generate 16 vertices from bitwise indices
        for (let i = 0; i < 16; i++) {
            this.vertices4D.push({
                x: (i & 1) ? 1 : -1,
                y: (i & 2) ? 1 : -1,
                z: (i & 4) ? 1 : -1,
                w: (i & 8) ? 1 : -1,
            });
        }

        // 2. Generate 32 edges: pairs that differ in exactly one coordinate (one bit in XOR)
        for (let i = 0; i < 16; i++) {
            for (let j = i + 1; j < 16; j++) {
                const xor = i ^ j;
                if (xor === 1 || xor === 2 || xor === 4 || xor === 8) {
                    this.allEdges.push([i, j]);
                }
            }
        }

        // 3. Kruskal's algorithm with union-find for spanning tree
        const parent = Array.from({ length: 16 }, (_, i) => i);
        const rank = new Array(16).fill(0);

        const find = (x) => {
            while (parent[x] !== x) {
                parent[x] = parent[parent[x]];
                x = parent[x];
            }
            return x;
        };

        const union = (a, b) => {
            const ra = find(a);
            const rb = find(b);
            if (ra === rb) {return false;}
            if (rank[ra] < rank[rb]) {
                parent[ra] = rb;
            } else if (rank[ra] > rank[rb]) {
                parent[rb] = ra;
            } else {
                parent[rb] = ra;
                rank[ra]++;
            }
            return true;
        };

        // Shuffle edges for random spanning tree
        const shuffled = [...this.allEdges];
        for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }

        const treeEdges = [];
        const nonTreeEdges = [];

        for (const edge of shuffled) {
            if (union(edge[0], edge[1])) {
                treeEdges.push(edge);
            } else {
                nonTreeEdges.push(edge);
            }
        }

        // 4. Spanning tree (15 edges) + 5 random non-tree edges
        this.mazeEdges = [...treeEdges];

        for (let i = nonTreeEdges.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [nonTreeEdges[i], nonTreeEdges[j]] = [nonTreeEdges[j], nonTreeEdges[i]];
        }
        const extraCount = Math.min(5, nonTreeEdges.length);
        for (let i = 0; i < extraCount; i++) {
            this.mazeEdges.push(nonTreeEdges[i]);
        }

        // 5. Initial projection
        this._project();
    }

    _project() {
        const cosXW = Math.cos(this.angleXW);
        const sinXW = Math.sin(this.angleXW);
        const cosYW = Math.cos(this.angleYW);
        const sinYW = Math.sin(this.angleYW);

        for (let i = 0; i < this.vertices4D.length; i++) {
            const v = this.vertices4D[i];

            // Apply XW rotation
            const xr = v.x * cosXW - v.w * sinXW;
            const wr = v.x * sinXW + v.w * cosXW;

            // Apply YW rotation
            const yr = v.y * cosYW - wr * sinYW;
            const wr2 = v.y * sinYW + wr * cosYW;

            // Stereographic projection
            const factor = 2.0 / (3.0 - wr2);
            const px = xr * factor;
            const py = yr * factor;
            const pz = v.z * factor;

            if (this.projected[i]) {
                this.projected[i].set(px, py, pz);
            } else {
                this.projected[i] = new THREE.Vector3(px, py, pz);
            }
        }
    }

    _createMeshes() {
        // Vertex meshes: Icosahedron at each projected vertex
        const vertexGeo = new THREE.IcosahedronGeometry(0.08, 1);
        for (let i = 0; i < 16; i++) {
            const mat = createRimMaterial(PALETTE.NODE_ACTIVE, PALETTE.NODE_RIM);
            registerMaterial(mat);
            const mesh = new THREE.Mesh(vertexGeo, mat);
            mesh.position.copy(this.projected[i]);
            this.vertexMeshes.push(mesh);
            this.group.add(mesh);
        }

        // Edge meshes: cylinders for each maze edge
        const edgeGeo = new THREE.CylinderGeometry(0.03, 0.03, 1, 6);
        for (let i = 0; i < this.mazeEdges.length; i++) {
            const [a, b] = this.mazeEdges[i];
            const mat = createRimMaterial(PALETTE.MAZE_CORRIDOR, PALETTE.RIM_CYAN, 4.0);
            registerMaterial(mat);
            const mesh = new THREE.Mesh(edgeGeo, mat);
            this._updateEdgeMesh(mesh, this.projected[a], this.projected[b]);
            this.edgeMeshes.push(mesh);
            this.group.add(mesh);
        }

        // Wireframe: LineSegments for ALL 32 edges (dim)
        const wirePositions = new Float32Array(this.allEdges.length * 6);
        for (let i = 0; i < this.allEdges.length; i++) {
            const [a, b] = this.allEdges[i];
            const pa = this.projected[a];
            const pb = this.projected[b];
            wirePositions[i * 6 + 0] = pa.x;
            wirePositions[i * 6 + 1] = pa.y;
            wirePositions[i * 6 + 2] = pa.z;
            wirePositions[i * 6 + 3] = pb.x;
            wirePositions[i * 6 + 4] = pb.y;
            wirePositions[i * 6 + 5] = pb.z;
        }
        const wireGeo = new THREE.BufferGeometry();
        wireGeo.setAttribute('position', new THREE.BufferAttribute(wirePositions, 3));
        const wireMat = createEdgeGlowMaterial(PALETTE.WIREFRAME_DIM, 0.15);
        this.wireframe = new THREE.LineSegments(wireGeo, wireMat);
        this.group.add(this.wireframe);
    }

    _setupPuzzle() {
        const pieceTypes = ['tetra', 'cube', 'dodeca'];
        const pieceColors = [PALETTE.PIECE_1, PALETTE.PIECE_2, PALETTE.PIECE_3];

        const pieceGeometries = [
            new THREE.TetrahedronGeometry(0.12, 0),
            new THREE.BoxGeometry(0.15, 0.15, 0.15),
            new THREE.DodecahedronGeometry(0.12, 0),
        ];

        // Pick 3 non-adjacent vertices for puzzle pieces
        const usedVertices = new Set();
        const pieceVertices = [];
        const allIndices = Array.from({ length: 16 }, (_, i) => i);

        // Shuffle for randomness
        for (let i = allIndices.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
        }

        for (const idx of allIndices) {
            if (pieceVertices.length >= 3) {break;}
            // Check non-adjacency to already picked vertices
            let adjacent = false;
            for (const pv of pieceVertices) {
                const xor = idx ^ pv;
                if (xor === 1 || xor === 2 || xor === 4 || xor === 8) {
                    adjacent = true;
                    break;
                }
            }
            if (!adjacent) {
                pieceVertices.push(idx);
                usedVertices.add(idx);
            }
        }

        // Pick 3 other random vertices for targets
        const targetVertices = [];
        for (const idx of allIndices) {
            if (targetVertices.length >= 3) {break;}
            if (!usedVertices.has(idx)) {
                targetVertices.push(idx);
                usedVertices.add(idx);
            }
        }

        // Create piece meshes
        for (let i = 0; i < 3; i++) {
            const mat = createRimMaterial(pieceColors[i], pieceColors[i]);
            registerMaterial(mat);
            const mesh = new THREE.Mesh(pieceGeometries[i], mat);
            const vi = pieceVertices[i];
            mesh.position.copy(this.projected[vi]);
            this.group.add(mesh);
            this.puzzlePieces.push({
                mesh,
                vertex: vi,
                type: pieceTypes[i],
                placed: false,
                carried: false,
            });
        }

        // Create target meshes (ghost materials)
        for (let i = 0; i < 3; i++) {
            const ghostMat = createGhostMaterial(pieceColors[i]);
            registerMaterial(ghostMat);
            // Same geometry shape as its matching piece type
            const ghostGeo = pieceGeometries[i].clone();
            const mesh = new THREE.Mesh(ghostGeo, ghostMat);
            const vi = targetVertices[i];
            mesh.position.copy(this.projected[vi]);
            this.group.add(mesh);
            this.targets.push({
                mesh,
                vertex: vi,
                type: pieceTypes[i],
                filled: false,
            });
        }
    }

    _updateEdgeMesh(mesh, startPos, endPos) {
        const mid = new THREE.Vector3().addVectors(startPos, endPos).multiplyScalar(0.5);
        mesh.position.copy(mid);

        const dir = new THREE.Vector3().subVectors(endPos, startPos);
        const length = dir.length();
        mesh.scale.set(1, length, 1);

        dir.normalize();
        const yAxis = new THREE.Vector3(0, 1, 0);
        const dot = yAxis.dot(dir);

        if (Math.abs(dot + 1) < 0.0001) {
            // Antiparallel: rotate 180° around X
            mesh.quaternion.setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI);
        } else if (Math.abs(dot - 1) < 0.0001) {
            // Parallel: identity
            mesh.quaternion.identity();
        } else {
            mesh.quaternion.setFromUnitVectors(yAxis, dir);
        }
    }

    update(delta) {
        // Auto-rotate XW slowly
        this.angleXW += this.autoRotateSpeed * delta * 0.3;
        this._project();

        // Update vertex mesh positions
        for (let i = 0; i < 16; i++) {
            this.vertexMeshes[i].position.copy(this.projected[i]);
        }

        // Update edge mesh transforms
        for (let i = 0; i < this.mazeEdges.length; i++) {
            const [a, b] = this.mazeEdges[i];
            this._updateEdgeMesh(this.edgeMeshes[i], this.projected[a], this.projected[b]);
        }

        // Update wireframe positions
        const posAttr = this.wireframe.geometry.getAttribute('position');
        for (let i = 0; i < this.allEdges.length; i++) {
            const [a, b] = this.allEdges[i];
            const pa = this.projected[a];
            const pb = this.projected[b];
            posAttr.setXYZ(i * 2, pa.x, pa.y, pa.z);
            posAttr.setXYZ(i * 2 + 1, pb.x, pb.y, pb.z);
        }
        posAttr.needsUpdate = true;

        // Update puzzle piece positions (follow their vertex)
        for (const piece of this.puzzlePieces) {
            if (!piece.carried && !piece.placed) {
                piece.mesh.position.copy(this.projected[piece.vertex]);
                piece.mesh.rotation.y += delta * 1.5;
                piece.mesh.rotation.x += delta * 0.7;
            } else if (piece.placed) {
                piece.mesh.position.copy(this.projected[piece.vertex]);
            }
        }

        // Update target positions (follow their vertex)
        for (const target of this.targets) {
            target.mesh.position.copy(this.projected[target.vertex]);
            target.mesh.rotation.y += delta * 0.8;
        }
    }

    rotateXW(angle) {
        this.angleXW += angle;
    }

    rotateYW(angle) {
        this.angleYW += angle;
    }

    getVertexPosition(index) {
        return this.projected[index].clone();
    }

    getAdjacentVertices(vertexIndex) {
        const adjacent = [];
        for (const [a, b] of this.mazeEdges) {
            if (a === vertexIndex) {adjacent.push(b);}
            if (b === vertexIndex) {adjacent.push(a);}
        }
        return adjacent;
    }
}
