export class Bonus {
    constructor(game, x, y, level, id, name) {
        this.game = game
        this.x = x
        this.y = y
        this.level = level
        this.id = id
        this.at = [this.y / this.level.block_size, this.x / this.level.block_size]
        this.audio = new Audio(this.level[name + '_sound'])
        this.activeTiming = [];
        this.name = name
    }

    removeitfromgrid = () => this.game.map.gridArray[this.at[0]][this.at[1]] = 0
    removeitfromDOM = () => document.getElementById(this.id).remove()

    makeAction() {
        switch (this.name) {
            case 'speed':
                this.addSpeed()
                this.showSpeedEffect()
                break;
            case 'time':
                this.addTime()
                this.showTimeEffect()
                break;
            case 'heart':
                this.addLive()
                this.showTimeEffect()
                this.showLiveEffect()
                break;
            default:
                break;
        }
    }

    addTime = () => this.game.state.addtime(10);

    addLive() {
        this.game.state.setLives(1);
        this.game.scoreboard.updateLives()
    }

    addSpeed() {
        this.game.state.setPlayerspped(6)
        this.audio.currentTime = 0
        const id = setTimeout(() => {
            this.game.state.setPlayerspped(4)
        }, 2000)
        this.activeTiming.push(id)
    }

    showSpeedEffect() {
        const effect = document.createElement("div");
        effect.className = "speed-effect";
        effect.style.left = `${this.x}px`;
        effect.style.top = `${this.y}px`;
        this.game.map.grid.appendChild(effect);
        const id = setTimeout(() => effect.remove(), 500);
        this.activeTiming.push(id);
        this.audio.play().catch(err => console.error(err));
    }

    showTimeEffect() {
        const effect = document.createElement("div");
        effect.className = "time-effect";
        effect.style.left = `${this.x}px`;
        effect.style.top = `${this.y}px`;
        this.game.map.grid.appendChild(effect);
        const id = setTimeout(() => effect.remove(), 500);
        this.activeTiming.push(id);
        this.audio.play().catch(err => console.error(err));
    }

    showLiveEffect() {
        const effect = document.createElement("div");
        effect.className = "heart-effect";
        effect.style.left = `${this.x}px`;
        effect.style.top = `${this.y}px`;
        this.game.map.grid.appendChild(effect);
        const id = setTimeout(() => effect.remove(), 500);
        this.activeTiming.push(id);
        this.audio.play().catch(err => console.error(err));
    }

}