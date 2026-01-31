// Her UI  <<>>
export class UI {
    constructor(game) {
        UI.instance = this;
        this.game = game
    }
    static getInstance = (game) => UI.instance ? UI.instance : new UI(game)
    static resetInstance() {
        UI.instance = null;
    }
}