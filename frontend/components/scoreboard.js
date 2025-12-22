export class Scoreboard {

    constructor(game) {
        this.game = game
        let ScoreBoard = document.createElement("div")
        ScoreBoard.id = "ScoreBoard"
        document.body.appendChild(ScoreBoard)
        this.lives = document.createElement("span")
        this.lives.innerText = "lives: " + "❤️".repeat(game.state.getLives())
        ScoreBoard.appendChild(this.lives)
        this.score = document.createElement("span")
        this.score.innerText = `score: ${game.state.getScore()}`
        ScoreBoard.appendChild(this.score)
        this.level = document.createElement("span")
        this.level.innerText = `level: ${game.state.getLevel()}`
        ScoreBoard.appendChild(this.level)
        this.timer = document.createElement("span")
        this.timer.innerText = "timer: "
        ScoreBoard.appendChild(this.timer)
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

