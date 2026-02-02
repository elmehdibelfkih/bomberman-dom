import { NetworkManager } from '../network/networkManager.js';

export class UI {
    constructor(game) {
        UI.instance = this;
        this.game = game;
        this.networkManager = NetworkManager.getInstance();
        this.pingInterval = null;
    }

    initPingDisplay() {
        const playersInfo = document.querySelector('.players-info');
        if (playersInfo) {
            const pingDisplay = document.createElement('div');
            pingDisplay.id = 'ping-display';
            pingDisplay.textContent = 'Ping: ...';
            playersInfo.appendChild(pingDisplay);

            this.pingInterval = setInterval(() => {
                pingDisplay.textContent = `Ping: ${this.networkManager.getPing()}ms`;
            }, 1000);
        }
    }

    destroyPingDisplay() {
        if (this.pingInterval) {
            clearInterval(this.pingInterval);
            this.pingInterval = null;
        }
        const pingDisplay = document.getElementById('ping-display');
        if (pingDisplay) {
            pingDisplay.remove();
        }
    }

    static getInstance = (game) => UI.instance ? UI.instance : new UI(game)
    static resetInstance() {
        UI.instance = null;
    }
}