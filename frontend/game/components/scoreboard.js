import { dom } from '../../framwork/index.js';

export class Scoreboard {

    constructor(game) {
        this.game = game

        // Create scoreboard with all children as virtual nodes
        const ScoreBoard = dom({
            tag: "div",
            attributes: { id: "ScoreBoard" },
            children: [
                {
                    tag: "span",
                    attributes: {},
                    children: ["lives: " + "❤️".repeat(game.state.getLives())]
                },
                {
                    tag: "span",
                    attributes: {},
                    children: [`score: ${game.state.getScore()}`]
                },
                {
                    tag: "span",
                    attributes: {},
                    children: [`level: ${game.state.getLevel()}`]
                },
                {
                    tag: "span",
                    attributes: {},
                    children: ["timer: "]
                }
            ]
        });

        document.body.appendChild(ScoreBoard)

        // Get references to the child elements
        const spans = ScoreBoard.querySelectorAll('span');
        this.lives = spans[0];
        this.score = spans[1];
        this.level = spans[2];
        this.timer = spans[3];
    }

    initScoreBaord() {
        this.updateLives = () => this.lives.innerText = "lives: " + "❤️".repeat(this.game.state.getLives())
        this.updateScore = () => this.score.innerText = `score: ${this.game.state.getScore()}`
        this.updateLevel = () => this.level.innerText = `level: ${this.game.state.getLevel()}`
        this.updateTimer = () => this.timer.innerText = `time: ${this.game.state.getTime()}`
    }

    static getInstance = (game) => {
        if (!Scoreboard.instance) Scoreboard.instance = new Scoreboard(game);
        return Scoreboard.instance;
    }

    updateLives = () => this.lives.innerText = "lives: " + "❤️".repeat(this.game.state.getLives())
    updateScore = () => this.score.innerText = `score: ${this.game.state.getScore()}`
    updateLevel = () => this.level.innerText = `level: ${this.game.state.getLevel()}`
    updateTimer = () => {
        let totalSeconds = this.game.state.getTime(); let minutes = Math.floor(totalSeconds / 60); let seconds = totalSeconds % 60;
        this.timer.innerText = `Time: ${minutes}m ${seconds}s`;
    };
}

