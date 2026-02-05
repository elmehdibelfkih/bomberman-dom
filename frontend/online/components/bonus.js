import { dom } from '../../framework/framework/index.js'

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
    // removeitfromDOM = () => document.getElementById(this.id).remove()

    makeAction() {
        switch (this.name) {
            case 'speed':
                this.addSpeed()
                this.showSpeedEffect()
                break;
            case 'flame':
                this.addBombRange()
                break;
            case 'bomb':
                this.addMaxBombs()
            default:
                break;
        }
    }

    addBombRange() {

    }

    addMaxBombs() {

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
        const effect = dom({
            tag: 'div',
            attributes: {
                class: 'speed-effect',
                style: `left: ${this.x}px; top: ${this.y}px;`
            }
        });
        this.game.map.grid.appendChild(effect);
        const id = setTimeout(() => effect.remove(), 500);
        this.activeTiming.push(id);
        this.audio.play().catch(err => console.error(err));
    }
}