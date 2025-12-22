export class Enemy {
    constructor(game, level, x, y, Cordination) {
        this.game = game;
        this.x = x;
        this.y = y;
        this.level = level;
        this.direction = "Right";
        this.enemySize = 40;
        this.speed = this.game.map.level.enemy_speed;
        this.detect = true;
        this.lastposition = "";
        this.mustrender = true;
        this.targetX = x;
        this.targetY = y;
        this.Div = null;
        this.dead = false;
        this.change = true
        this.AnimationCord = Cordination;
        this.isMoving = false;
        this.stuckCounter = 0;
        this.maxStuckFrames = 5;
        this.currentFrame = null;
        this._collisionTimer = 0;
    }

    killEnemy(cs = true) {
        if (this.Div && this.Div.parentNode) {
            this.Div.parentNode.removeChild(this.Div);
            if (cs) this.game.state.setScore(100);
            this.dead = true;
        }
        this.Div = null;
        this.game = null;
        this.level = null;
        this.AnimationCord = null;
    }

    async checkColision() {
        if (this.dead) return
        const blockSize = this.level.block_size;
        const now = performance.now();
        for (let bomb of this.game.map.bombs) {
            if (!bomb.active) continue;
            if (now < bomb.startTime + bomb.explosionTime) continue;
            const bombX = bomb.xMap * blockSize;
            const bombY = bomb.yMap * blockSize;
            if (this.isColliding(bombX, bombY, blockSize, blockSize)) {
                this.killEnemy();
                this.dead = true;
                return;
            }
            for (let dir of bomb.freeBlocks) {
                let ex = bombX, ey = bombY;
                if (dir === 0) ey += blockSize;
                if (dir === 1) ex -= blockSize;
                if (dir === 2) ey -= blockSize;
                if (dir === 3) ex += blockSize;
                if (this.isColliding(ex, ey, blockSize, blockSize)) {
                    this.killEnemy();
                    this.dead = true;
                    return;
                }
            }
        }
    }

    getValidDirections() {
        const directions = {
            Up: { rowset: -1, colset: 0 },
            Down: { rowset: 1, colset: 0 },
            Left: { rowset: 0, colset: -1 },
            Right: { rowset: 0, colset: 1 }
        };
        if (!this.level) return
        const blockSize = this.level.block_size;
        const col = Math.floor(this.x / blockSize);
        const row = Math.floor(this.y / blockSize);

        const validDirections = [];
        for (let [dirName, dirData] of Object.entries(directions)) {
            const nextRow = row + dirData.rowset;
            const nextCol = col + dirData.colset;
            if (this.game.map.Canmove(nextRow, nextCol)) validDirections.push(dirName);
        }
        return validDirections;
    }

    getOppositeDirection(direction) {
        const opposites = {
            Up: "Down",
            Down: "Up",
            Left: "Right",
            Right: "Left"
        };
        return opposites[direction];
    }

    chooseNewDirection() {
        const validDirections = this.getValidDirections();
        if (validDirections.length === 0) return this.direction;
        if (validDirections.length === 1) return validDirections[0];
        const oppositeOfLast = this.getOppositeDirection(this.lastposition);
        const filteredDirections = validDirections.filter(dir => dir !== oppositeOfLast);
        const finalDirections = filteredDirections.length > 0 ? filteredDirections : validDirections;
        return finalDirections[Math.floor(Math.random() * finalDirections.length)];
    }

    hasReachedTarget() {
        return Math.abs(this.x - this.targetX) < this.speed &&
            Math.abs(this.y - this.targetY) < this.speed;
    }

    async moveTowardsTarget() {
        const directions = {
            Up: { rowset: -1, colset: 0 },
            Down: { rowset: 1, colset: 0 },
            Left: { rowset: 0, colset: -1 },
            Right: { rowset: 0, colset: 1 }
        };
        if (!this.level) return
        const blockSize = this.level.block_size;
        const col = Math.floor(this.x / blockSize);
        const row = Math.floor(this.y / blockSize);

        if (this.hasReachedTarget()) {
            this.x = this.targetX;
            this.y = this.targetY;
            this.isMoving = false;

            let nextRow = row + directions[this.direction].rowset;
            let nextCol = col + directions[this.direction].colset;

            if (this.game.map.Canmove(nextRow, nextCol)) {
                this.targetX = nextCol * blockSize + 12;
                this.targetY = nextRow * blockSize + 12;
                this.isMoving = true;
                this.stuckCounter = 0;
            } else {
                this.lastposition = this.direction;
                this.direction = this.chooseNewDirection();
                nextRow = row + directions[this.direction].rowset;
                nextCol = col + directions[this.direction].colset;
                this.change = true

                if (this.game.map.Canmove(nextRow, nextCol)) {
                    this.targetX = nextCol * blockSize + 12;
                    this.targetY = nextRow * blockSize + 12;
                    this.isMoving = true;
                    this.stuckCounter = 0;
                } else {
                    this.stuckCounter++;
                    if (this.stuckCounter > this.maxStuckFrames) {
                        const validDirs = this.getValidDirections();
                        if (validDirs.length > 0) {
                            this.direction = validDirs[Math.floor(Math.random() * validDirs.length)];
                            nextRow = row + directions[this.direction].rowset;
                            nextCol = col + directions[this.direction].colset;
                            this.targetX = nextCol * blockSize + 12;
                            this.targetY = nextRow * blockSize + 12;
                            this.isMoving = true;
                        }
                        this.stuckCounter = 0;
                    }
                }
            }
        }
        if (this.isMoving) {
            if (this.x < this.targetX) this.x += this.speed;
            if (this.x > this.targetX) this.x -= this.speed;
            if (this.y < this.targetY) this.y += this.speed;
            if (this.y > this.targetY) this.y -= this.speed;
        }
    }

    async updateRender() {
        if (this.dead) return;
        this._collisionTimer += 16;
        if (this._collisionTimer >= 100) {
            this.checkColision();
            this._collisionTimer = 0;
        }
        if (this.game && this.game.player &&
            this.game.player.isColliding(this.x, this.y, this.enemySize, this.enemySize)) {
            this.game.player.kill();
        }
        this.moveTowardsTarget();
        this.arzigid();
    }

    async arzigid() {
        if (!this.Div) return;
        const frame = this.AnimationCord[this.direction];
        if (!this.currentFrame) {
            this.Div.style.width = `${frame.width}px`;
            this.Div.style.height = `${frame.height}px`;
            this.currentFrame = frame;
        }
        if (this.change) {
            this.Div.style.backgroundPosition = `${frame.x}px ${frame.y}px`;
            this.change = false
        }
        this.Div.style.transform = `translate(${this.x}px, ${this.y}px)`;
    }

    isColliding(x, y, w, h) {
        return !(this.x + this.enemySize < x || this.x > x + w ||
            this.y + this.enemySize < y || this.y > y + h);
    }
}
