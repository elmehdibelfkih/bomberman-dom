import * as helpers from '../utils/helpers.js';
import { eventManager } from '../../framework/framework/index.js';
export class State {

    #SOUND = true

    constructor(game) {
        State.instance = this;
        this.game = game;
        this._boundSwitch = this.switch.bind(this);
    }

    static getInstance = (game) => State.instance ? State.instance : new State(game)

    static resetInstance() {
        State.instance = null;
    }
    isSoundOn = () => this.#SOUND;
    updatesound = (ff) => this.#SOUND = ff
    update = () => {}
    
    initState() {
        this.#SOUND = true;
    }

    updateSoundIcon = () => {
        const ic = document.getElementById('volume-icon');
        if (!ic) return;
        ic.src = this.#SOUND ? './icon/volume-2.svg' : './icon/volume-x.svg';
    };

    initArrowState() {
        eventManager.linkNodeToHandlers(document.getElementById('sound'), 'click', this._boundSwitch);
    }

    switch() {
        const ic = document.getElementById('volume-icon')
        if (!this.game.map.backGroundMusic) return;
        if (this.#SOUND) {
            ic.src = './icon/volume-x.svg'
            this.game.map.backGroundMusic.volume = 0.0;
            this.#SOUND = false
        } else {
            ic.src = './icon/volume-2.svg'
            this.game.map.backGroundMusic.volume = 0.3;
            this.#SOUND = true
        }
    }

    removeEventListeners() {
        eventManager.linkNodeToHandlers(document.getElementById('sound'), 'click', null);
    }
}
