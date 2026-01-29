export class Renderer {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext('2d');
    }

    clear() {
        if (this.ctx) {
            this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        }
    }

    render(entities) {
        this.clear();
        // Render entities
    }

    setCanvas(canvas) {
        this.canvas = canvas;
        this.ctx = canvas?.getContext('2d');
    }
}
