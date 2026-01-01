import { dom, eventEmitter, createSignal, createEffect } from '../framwork/index.js';
import { ReactiveGameState } from './ReactiveGameState.js';

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
        this.gameState = ReactiveGameState.getInstance();
        
        // Reactive state for power-up
        this.isCollected = createSignal(false);
        this.effectActive = createSignal(false);
        
        // Effect for cleanup when collected
        createEffect(() => {
            if (this.isCollected()[0]()) {
                this.cleanup();
            }
        });
    }

    removeitfromgrid = () => this.game.map.gridArray[this.at[0]][this.at[1]] = 0
    removeitfromDOM = () => document.getElementById(this.id).remove()

    makeAction() {
        this.isCollected()[1](true);
        eventEmitter.emit('powerUpCollected', { type: this.name, powerUpId: this.id });
        
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
        eventEmitter.emit('livesChanged', { lives: this.game.state.getLives() });
    }

    addSpeed() {
        this.effectActive()[1](true);
        this.game.state.setPlayerspped(6)
        this.audio.currentTime = 0
        eventEmitter.emit('speedBoostActivated', { duration: 2000 });
        const id = setTimeout(() => {
            this.game.state.setPlayerspped(4)
            this.effectActive()[1](false);
            eventEmitter.emit('speedBoostDeactivated');
        }, 2000)
        this.activeTiming.push(id)
    }

    showSpeedEffect() {
        const effect = dom({
            tag: 'div',
            attributes: {
                class: 'speed-effect',
                style: `left: ${this.x}px; top: ${this.y}px`
            }
        });
        this.game.map.grid.appendChild(effect);
        const id = setTimeout(() => effect.remove(), 500);
        this.activeTiming.push(id);
        this.audio.play().catch(err => console.error(err));
    }

    showTimeEffect() {
        const effect = dom({
            tag: 'div',
            attributes: {
                class: 'time-effect',
                style: `left: ${this.x}px; top: ${this.y}px`
            }
        });
        this.game.map.grid.appendChild(effect);
        const id = setTimeout(() => effect.remove(), 500);
        this.activeTiming.push(id);
        this.audio.play().catch(err => console.error(err));
    }

    showLiveEffect() {
        const effect = dom({
            tag: 'div',
            attributes: {
                class: 'heart-effect',
                style: `left: ${this.x}px; top: ${this.y}px`
            }
        });
        this.game.map.grid.appendChild(effect);
        const id = setTimeout(() => effect.remove(), 500);
        this.activeTiming.push(id);
        this.audio.play().catch(err => console.error(err));
    }

    cleanup() {
        // Clear all active timers
        this.activeTiming.forEach(id => clearTimeout(id));
        this.activeTiming = [];
    }

}