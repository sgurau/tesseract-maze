export class UI {
    constructor(gravitySystem) {
        this.gravity = gravitySystem;
        this.gravityCanvas = document.getElementById('gravity-canvas');
        this.gravityCtx = this.gravityCanvas ? this.gravityCanvas.getContext('2d') : null;
        this.gravityName = document.getElementById('gravity-name');
        this.scoreValue = document.getElementById('score-value');
        this.messageDisplay = document.getElementById('message-display');
        this.gravityFlash = document.getElementById('gravity-flash');
        this.loadingScreen = document.getElementById('loading-screen');

        this.messageTimeout = null;
        this.fpsDisplay = null;
        this.showFps = false;
        this.frameCount = 0;
        this.fpsTime = 0;
        this.currentFps = 0;
    }

    hideLoading() {
        if (this.loadingScreen) {
            this.loadingScreen.classList.add('hidden');
        }
    }

    update(delta, piecesPlaced, totalPieces) {
        // Update gravity indicator canvas
        this._drawGravityIndicator();

        // Update gravity name text
        if (this.gravityName) {
            this.gravityName.textContent = this.gravity.getDirectionName();
            this.gravityName.style.color = this.gravity.getDirectionColor();
        }

        // Update score
        if (this.scoreValue) {
            this.scoreValue.textContent = `${piecesPlaced} / ${totalPieces}`;
        }

        // FPS counter
        this.frameCount++;
        this.fpsTime += delta;
        if (this.fpsTime >= 1.0) {
            this.currentFps = Math.round(this.frameCount / this.fpsTime);
            this.frameCount = 0;
            this.fpsTime = 0;

            if (this.showFps && this.fpsDisplay) {
                this.fpsDisplay.textContent = `${this.currentFps} FPS`;
            }
        }
    }

    _drawGravityIndicator() {
        // Draw a stylized isometric cube wireframe on the 2D canvas
        // with an arrow inside pointing in the current gravity direction
        if (!this.gravityCtx) {return;}
        const ctx = this.gravityCtx;
        const w = this.gravityCanvas.width || 80;
        const h = this.gravityCanvas.height || 80;
        ctx.clearRect(0, 0, w, h);

        const cx = w / 2;
        const cy = h / 2;
        const size = 22;

        // Isometric projection helper
        const iso = (x, y, z) => ({
            x: cx + (x - z) * 0.7 * size,
            y: cy + ((x + z) * 0.4 - y) * size
        });

        const cubeVerts = [
            iso(-1, -1, -1), iso(1, -1, -1), iso(1, -1, 1), iso(-1, -1, 1),
            iso(-1, 1, -1), iso(1, 1, -1), iso(1, 1, 1), iso(-1, 1, 1)
        ];

        // Draw cube edges
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.3)';
        ctx.lineWidth = 1;
        const edges = [
            [0, 1], [1, 2], [2, 3], [3, 0],
            [4, 5], [5, 6], [6, 7], [7, 4],
            [0, 4], [1, 5], [2, 6], [3, 7]
        ];
        for (const [a, b] of edges) {
            ctx.beginPath();
            ctx.moveTo(cubeVerts[a].x, cubeVerts[a].y);
            ctx.lineTo(cubeVerts[b].x, cubeVerts[b].y);
            ctx.stroke();
        }

        // Draw gravity arrow
        const gravDir = this.gravity.getCurrentGravity();
        const arrowEnd = iso(gravDir.x * 0.8, gravDir.y * 0.8, gravDir.z * 0.8);
        const color = this.gravity.getDirectionColor();

        // Arrow glow
        ctx.save();
        ctx.shadowColor = color;
        ctx.shadowBlur = 6;

        ctx.strokeStyle = color;
        ctx.lineWidth = 2.5;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(arrowEnd.x, arrowEnd.y);
        ctx.stroke();

        // Arrowhead
        const angle = Math.atan2(arrowEnd.y - cy, arrowEnd.x - cx);
        const headLen = 8;
        ctx.beginPath();
        ctx.moveTo(arrowEnd.x, arrowEnd.y);
        ctx.lineTo(
            arrowEnd.x - headLen * Math.cos(angle - 0.4),
            arrowEnd.y - headLen * Math.sin(angle - 0.4)
        );
        ctx.moveTo(arrowEnd.x, arrowEnd.y);
        ctx.lineTo(
            arrowEnd.x - headLen * Math.cos(angle + 0.4),
            arrowEnd.y - headLen * Math.sin(angle + 0.4)
        );
        ctx.stroke();

        ctx.restore();

        // Center dot
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(cx, cy, 3, 0, Math.PI * 2);
        ctx.fill();
    }

    showMessage(text, duration = 2000) {
        if (!this.messageDisplay) {return;}
        this.messageDisplay.textContent = text;
        this.messageDisplay.classList.add('visible');

        if (this.messageTimeout) {clearTimeout(this.messageTimeout);}
        this.messageTimeout = setTimeout(() => {
            this.messageDisplay.classList.remove('visible');
        }, duration);
    }

    flashGravity(color) {
        if (!this.gravityFlash) {return;}
        this.gravityFlash.style.background =
            `radial-gradient(circle, ${color}40 0%, transparent 70%)`;
        this.gravityFlash.classList.remove('active');
        void this.gravityFlash.offsetWidth; // force reflow for re-triggering animation
        this.gravityFlash.classList.add('active');
        setTimeout(() => this.gravityFlash.classList.remove('active'), 600);
    }

    toggleFps() {
        this.showFps = !this.showFps;

        if (this.showFps) {
            if (!this.fpsDisplay) {
                this.fpsDisplay = document.createElement('div');
                this.fpsDisplay.id = 'fps-display';
                this.fpsDisplay.style.cssText =
                    'position:fixed;top:8px;left:8px;color:#00f0ff;font-family:monospace;' +
                    'font-size:12px;opacity:0.7;pointer-events:none;z-index:9999;';
                document.body.appendChild(this.fpsDisplay);
            }
            this.fpsDisplay.style.display = 'block';
            this.fpsDisplay.textContent = `${this.currentFps} FPS`;
        } else if (this.fpsDisplay) {
            this.fpsDisplay.style.display = 'none';
        }
    }
}
