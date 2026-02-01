export class GameLoop {
    constructor() {
        this.isRunning = false;
        this.lastTime = 0;
        this.fps = 0;
        this.frameCount = 0;
        this.fpsUpdateTime = 0;
        this.updateCallbacks = [];
        this.renderCallbacks = [];
        this.targetFPS = 60;
        this.frameTime = 1000 / this.targetFPS;
    }

    addUpdateCallback(callback) {
        this.updateCallbacks.push(callback);
    }

    addRenderCallback(callback) {
        this.renderCallbacks.push(callback);
    }

    removeCallback(callback) {
        this.updateCallbacks = this.updateCallbacks.filter(cb => cb !== callback);
        this.renderCallbacks = this.renderCallbacks.filter(cb => cb !== callback);
    }

    start() {
        if (this.isRunning) return;
        this.isRunning = true;
        this.lastTime = performance.now();
        this.fpsUpdateTime = this.lastTime;
        this.loop();
    }

    stop() {
        this.isRunning = false;
    }

    loop = (currentTime = performance.now()) => {
        if (!this.isRunning) return;

        const deltaTime = currentTime - this.lastTime;
        this.lastTime = currentTime;

        // Update FPS counter
        this.frameCount++;
        if (currentTime - this.fpsUpdateTime >= 1000) {
            this.fps = Math.round((this.frameCount * 1000) / (currentTime - this.fpsUpdateTime));
            this.frameCount = 0;
            this.fpsUpdateTime = currentTime;
        }

        // Update game logic
        this.updateCallbacks.forEach(callback => {
            try {
                callback(deltaTime, currentTime);
            } catch (error) {
                console.error('Update callback error:', error);
            }
        });

        // Render
        this.renderCallbacks.forEach(callback => {
            try {
                callback(deltaTime, currentTime);
            } catch (error) {
                console.error('Render callback error:', error);
            }
        });

        // Schedule next frame
        requestAnimationFrame(this.loop);
    }

    getFPS() {
        return this.fps;
    }

    getPerformanceInfo() {
        return {
            fps: this.fps,
            isRunning: this.isRunning,
            updateCallbacks: this.updateCallbacks.length,
            renderCallbacks: this.renderCallbacks.length
        };
    }
}