import * as THREE from 'three';
import { initScene } from './scene.js';
import { TesseractMaze } from './maze.js';
import { GravitySystem } from './gravity.js';
import { Player } from './player.js';
import { SnapSystem } from './snap.js';
import { UI } from './ui.js';
import { updateMaterials } from './shaders.js';

// ---- Initialize Systems ----
const { scene, camera, renderer, controls, composer, clock, playerLight } = initScene();
const maze = new TesseractMaze(scene);
const gravity = new GravitySystem();
const player = new Player(scene, maze, gravity);
const snap = new SnapSystem();
const ui = new UI(gravity);

// ---- Game State ----
let piecesPlaced = 0;
const totalPieces = 3; // maze generates 3 pieces and 3 targets
let gameWon = false;
let snapAnimations = []; // active snap animations
let totalTime = 0;

// ---- Input Handling ----
const keys = {};

window.addEventListener('keydown', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = true;

    // Also track arrow keys by their lowercase name for consistent lookup
    if (e.key === 'ArrowUp') {keys['arrowup'] = true;}
    if (e.key === 'ArrowDown') {keys['arrowdown'] = true;}
    if (e.key === 'ArrowLeft') {keys['arrowleft'] = true;}
    if (e.key === 'ArrowRight') {keys['arrowright'] = true;}

    // Gravity switching: keys 1-6
    if (e.key >= '1' && e.key <= '6') {
        const dirIndex = parseInt(e.key) - 1;
        gravity.switchTo(dirIndex);
    }

    // 4D rotation
    const rotSpeed = 0.15; // radians per keypress
    if (key === 'q') {maze.rotateXW(-rotSpeed);}
    if (key === 'e') {maze.rotateXW(rotSpeed);}
    if (key === 'r') {maze.rotateYW(-rotSpeed);}
    if (key === 'f') {maze.rotateYW(rotSpeed);}

    // Player interaction
    if (e.key === ' ') {
        e.preventDefault();
        const result = player.interact();
        if (result) {
            if (result.action === 'pickup') {
                ui.showMessage('PIECE ACQUIRED', 1500);
            } else if (result.action === 'place') {
                tryPlacePiece(result.piece, result.vertex);
            }
        }
    }

    // FPS toggle
    if (key === 'p') {ui.toggleFps();}
});

window.addEventListener('keyup', (e) => {
    const key = e.key.toLowerCase();
    keys[key] = false;

    if (e.key === 'ArrowUp') {keys['arrowup'] = false;}
    if (e.key === 'ArrowDown') {keys['arrowdown'] = false;}
    if (e.key === 'ArrowLeft') {keys['arrowleft'] = false;}
    if (e.key === 'ArrowRight') {keys['arrowright'] = false;}
});

// ---- Gravity Switch Callback ----
gravity.onSwitch((direction) => {
    ui.flashGravity(gravity.getDirectionColor());
    ui.showMessage(`GRAVITY: ${direction.name}`, 1200);

    // Apply gravity to player
    player.applyGravity(direction.vector);

    // Apply gravity to uncarried, unplaced pieces
    for (const piece of maze.puzzlePieces) {
        if (!piece.placed && !piece.carried) {
            applyGravityToPiece(piece, direction.vector);
        }
    }
});

function applyGravityToPiece(piece, gravityDir) {
    // Slide piece along edges in gravity direction
    const pos = maze.getVertexPosition(piece.vertex);
    const adjacent = maze.getAdjacentVertices(piece.vertex);

    let bestVertex = -1;
    let bestDot = -Infinity;

    for (const adjIdx of adjacent) {
        const adjPos = maze.getVertexPosition(adjIdx);
        const dir = new THREE.Vector3().subVectors(adjPos, pos).normalize();
        const dot = dir.dot(gravityDir);
        if (dot > bestDot && dot > 0.5) {
            bestDot = dot;
            bestVertex = adjIdx;
        }
    }

    if (bestVertex >= 0) {
        piece.vertex = bestVertex;
        // Piece mesh position will be updated by maze.update()
    }
}

function tryPlacePiece(piece, vertex) {
    // Find matching target at this vertex
    for (const target of maze.targets) {
        if (target.vertex === vertex && !target.filled) {
            const piecePos = maze.getVertexPosition(vertex);
            const targetPos = maze.getVertexPosition(target.vertex);
            const result = snap.checkFit(piecePos, targetPos, piece.type, target.type);

            if (result === 'PERFECT') {
                // Snap the piece into place
                piece.placed = true;
                piece.carried = false;
                target.filled = true;
                player.carrying = null;
                piecesPlaced++;

                // Start snap animation
                const anim = snap.createSnapAnimation(piece.mesh, targetPos);
                snapAnimations.push(anim);

                // Hide target ghost mesh
                target.mesh.visible = false;

                ui.showMessage('\u2726 PIECE PLACED \u2726', 2000);

                // Check win condition
                if (piecesPlaced >= totalPieces) {
                    setTimeout(() => {
                        gameWon = true;
                        ui.showMessage('\u2726 TESSERACT COMPLETE \u2726', 5000);
                    }, 500);
                }
                return;
            } else if (result === 'WRONG_TYPE') {
                ui.showMessage('WRONG PIECE TYPE', 1500);
                return;
            }
        }
    }

    // No matching target at this vertex — drop the piece here
    piece.vertex = vertex;
    piece.carried = false;
    player.carrying = null;
    ui.showMessage('PIECE DROPPED', 1000);
}

// ---- Game Loop ----
function animate() {
    const delta = Math.min(clock.getDelta(), 0.05); // cap delta to prevent spiral
    totalTime += delta;

    // Update systems
    gravity.update(delta);
    maze.update(delta);

    // Player movement from held keys
    if (!gameWon) {
        const moveDir = new THREE.Vector3();
        if (keys['w'] || keys['arrowup']) {moveDir.z -= 1;}
        if (keys['s'] || keys['arrowdown']) {moveDir.z += 1;}
        if (keys['a'] || keys['arrowleft']) {moveDir.x -= 1;}
        if (keys['d'] || keys['arrowright']) {moveDir.x += 1;}

        if (moveDir.length() > 0) {
            moveDir.normalize();
            player.moveToward(moveDir, camera);
        }
    }

    player.update(delta);

    // Update snap animations, removing completed ones
    snapAnimations = snapAnimations.filter(anim => !anim.update(delta));

    // Update player light position to follow the player
    playerLight.position.copy(player.mesh.position);

    // Update shader time uniforms on all registered materials
    updateMaterials(totalTime);

    // Update UI
    ui.update(delta, piecesPlaced, totalPieces);

    // Update orbit controls
    controls.update();

    // Render with bloom post-processing
    composer.render();
}

renderer.setAnimationLoop(animate);

// ---- Hide loading screen after first frame ----
requestAnimationFrame(() => {
    setTimeout(() => ui.hideLoading(), 500);
});
