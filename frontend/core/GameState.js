export class GameState {
    constructor() {
        this.localPlayerId = null;
        this.players = new Map();
        this.bombs = new Map();
        this.powerups = new Map();
        this.mapData = null;
    }

    setLocalPlayer(playerId) {
        this.localPlayerId = playerId;
    }

    updatePlayer(playerId, data) {
        this.players.set(playerId, { ...this.players.get(playerId), ...data });
    }

    getLocalPlayer() {
        return this.players.get(this.localPlayerId);
    }

    clear() {
        this.players.clear();
        this.bombs.clear();
        this.powerups.clear();
    }
}
