import { dom, eventEmitter } from '../framwork/index.js';
import { GameRouter } from './GameRouter.js';

export class UI {
    constructor(game) {
        UI.instance = this;
        this.game = game
        this.gameRouter = GameRouter.getInstance();
        
        eventEmitter.on('gameOver', this.handleGameOver.bind(this));
        eventEmitter.on('levelComplete', this.handleLevelComplete.bind(this));
        eventEmitter.on('gameWon', this.handleGameWon.bind(this));
        eventEmitter.on('routeChanged', this.handleRouteChange.bind(this));
    }
    static getInstance = (game) => UI.instance ? UI.instance : new UI(game)
    
    handleGameOver(data) {
        this.GameOver();
    }

    handleLevelComplete(data) {
        this.nextLevel();
    }

    handleGameWon(data) {
        this.win();
    }
    
    GameOver() {
         const instructions = document.getElementById("instructions");
        const title = document.getElementById("menu-title");
        const message = document.getElementById("menu-message");
        const btn = document.getElementById("start-btn");
        instructions.classList.remove("hidden");
        if (this.game.state.GetState()) {
            title.textContent = "REFRECH GAME IS DONE";
            message.textContent = "Enjoy .....";
            btn.textContent = "Continue ...";
            this.game.state.updateStateof(false)
            this.game.state.Restar()
        } else {
            title.textContent = "GAME OVER";
            message.textContent = "Time’s up or you lost all lives!";
            btn.textContent = "PLAY AGAIN";
        } 
    }
    nextLevel() {
         const instructions = document.getElementById("instructions");
        instructions.classList.remove("hidden");
        const title = document.getElementById("menu-title");
        const message = document.getElementById("menu-message");
        title.textContent = "NEXT LEVEL";
        message.textContent = "Get ready!";
    }
    win() {
        const instructions = document.getElementById("instructions");
        instructions.classList.remove("hidden");
        const title = document.getElementById("menu-title");
        const message = document.getElementById("menu-message");
        title.textContent = "YOU WIN!";
        message.textContent = "Congratulations, you completed all levels!";
    }

    handleRouteChange(data) {
        console.log('UI handling route change:', data.route);
        
        switch (data.route) {
            case 'menu':
                this.showMainMenu();
                break;
            case 'game':
                this.showGameUI();
                break;
            case 'gameOver':
                this.GameOver();
                break;
            case 'levelComplete':
                this.nextLevel();
                break;
            case 'victory':
                this.win();
                break;
        }
    }

    showMainMenu() {
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.classList.remove('hidden');
        }
    }

    showGameUI() {
        const instructions = document.getElementById('instructions');
        if (instructions) {
            instructions.classList.add('hidden');
        }
    }

    createNavigationMenu() {
        const existingNav = document.getElementById('game-nav');
        if (existingNav) return;

        const nav = dom({
            tag: 'nav',
            attributes: {
                id: 'game-nav',
                style: 'position: fixed; top: 10px; right: 10px; z-index: 100;'
            },
            children: [
                {
                    tag: 'button',
                    attributes: {
                        onclick: () => this.gameRouter.goToMenu(),
                        style: 'margin: 5px; padding: 5px 10px;'
                    },
                    children: ['Menu']
                },
                {
                    tag: 'button',
                    attributes: {
                        onclick: () => this.gameRouter.goToSettings(),
                        style: 'margin: 5px; padding: 5px 10px;'
                    },
                    children: ['Settings']
                },
                {
                    tag: 'button',
                    attributes: {
                        onclick: () => this.gameRouter.goToLobby(),
                        style: 'margin: 5px; padding: 5px 10px;'
                    },
                    children: ['Multiplayer']
                }
            ]
        });

        document.body.appendChild(nav);
    }

}