import { dom, eventEmitter, createSignal, createEffect, createMemo } from '../framwork/index.js';

export class Scoreboard {

    constructor(game) {
        this.game = game
        
        // Reactive state
        this.lives = createSignal(game.state.getLives());
        this.score = createSignal(game.state.getScore());
        this.level = createSignal(game.state.getLevel());
        this.time = createSignal(game.state.getTime());
        
        // Computed display values
        this.livesDisplay = createMemo(() => "lives: " + "❤️".repeat(this.lives[0]()));
        this.scoreDisplay = createMemo(() => `score: ${this.score[0]()}`);
        this.levelDisplay = createMemo(() => `level: ${this.level[0]()}`);
        this.timeDisplay = createMemo(() => {
            const totalSeconds = this.time[0]();
            const minutes = Math.floor(totalSeconds / 60);
            const seconds = totalSeconds % 60;
            return `Time: ${minutes}m ${seconds}s`;
        });
        
        // Create DOM elements with reactive content
        let ScoreBoard = dom({
            tag: 'div',
            attributes: { id: 'ScoreBoard' }
        })
        document.body.appendChild(ScoreBoard)
        
        this.livesElement = dom({
            tag: 'span',
            children: [() => this.livesDisplay()]
        })
        ScoreBoard.appendChild(this.livesElement)
        
        this.scoreElement = dom({
            tag: 'span',
            children: [() => this.scoreDisplay()]
        })
        ScoreBoard.appendChild(this.scoreElement)
        
        this.levelElement = dom({
            tag: 'span',
            children: [() => this.levelDisplay()]
        })
        ScoreBoard.appendChild(this.levelElement)
        
        this.timerElement = dom({
            tag: 'span',
            children: [() => this.timeDisplay()]
        })
        ScoreBoard.appendChild(this.timerElement)
        
        // Effects for automatic updates
        createEffect(() => {
            this.lives[1](this.game.state.getLives());
        });
        
        createEffect(() => {
            this.score[1](this.game.state.getScore());
        });
        
        createEffect(() => {
            this.level[1](this.game.state.getLevel());
        });
        
        eventEmitter.on('scoreUpdated', this.handleScoreUpdate.bind(this));
        eventEmitter.on('livesChanged', this.handleLivesChange.bind(this));
        eventEmitter.on('levelChanged', this.handleLevelChange.bind(this));
    }

    handleScoreUpdate(data) {
        this.score[1](data.score);
    }

    handleLivesChange(data) {
        this.lives[1](data.lives);
    }

    handleLevelChange(data) {
        this.level[1](data.level);
    }

    updateTimer() {
        this.time[1](this.game.state.getTime());
    }

    // Legacy methods for compatibility
    updateLives = () => this.lives[1](this.game.state.getLives())
    updateScore = () => this.score[1](this.game.state.getScore())
    updateLevel = () => this.level[1](this.game.state.getLevel())
    
    initScoreBaord = () => {
        this.updateLives();
        this.updateScore();
        this.updateLevel();
        this.updateTimer();
    }

    static getInstance = (game) => {
        if (!Scoreboard.instance) Scoreboard.instance = new Scoreboard(game);
        return Scoreboard.instance;
    }
}

