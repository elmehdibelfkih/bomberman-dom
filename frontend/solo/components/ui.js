// Her UI  <<>>
export class UI {
    constructor(game) {
        UI.instance = this;
        this.game = game
    }
    static getInstance = (game) => UI.instance ? UI.instance : new UI(game)
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

}