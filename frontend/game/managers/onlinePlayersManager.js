import { eventManager } from '../../framework/index.js';
import * as consts from '../utils/consts.js';
import { MultiplayerUI } from '../components/MultiplayerUI.js';
import { OnlinePlayer } from '../components/OnlinePlayer.js';

export class MultiplayerPlayerManager {
    constructor(game, networkManager, router) {
        this.game = game;
        this.networkManager = networkManager;
        this.router = router;
        this.players = new Map();
        this.localPlayerId = null;
        // this.ui = new MultiplayerUI(game, networkManager, this.router);
        this.lastServerUpdateTime = 0;
        this.serverUpdateInterval = 100; // ms
    }

    async initializePlayers(gameData) {
        console.log('Initializing players:', gameData.players)
        this.localPlayerId = this.networkManager.getPlayerId();
        this.players.clear();

        const playerImage = gameData.mapData.player;
        console.log(playerImage);
        

        const playerPromises = gameData.players.map(async (playerData) => {
            const isLocal = playerData.playerId === this.localPlayerId;
            const player = new OnlinePlayer(playerData, isLocal, playerImage);
            await player.init();
            this.players.set(playerData.playerId, player);
        });

        await Promise.all(playerPromises);

        this.setupControls();
        // this.updatePlayersUI();
        // this.ui.updateGameStatus('PLAYING', 'Game started!');
        // this.game.state.SetPause(false);
    }

    // set up controle for bomb
    // todo: the user must send bomb response and wait the server response
    setupControls() {
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;

        eventManager.addEventListener(document.body, 'keydown', (event) => {
            // if (localPlayer.dying || this.game.state.isPaused()) return;
            if (localPlayer.dying ) return;

            const key = event.nativeEvent.key;
            if (key === ' ' && localPlayer.canPlaceBomb) {
                this.placeBomb(localPlayer);
                localPlayer.canPlaceBomb = false;
            }
        });

        eventManager.addEventListener(document.body, 'keyup', (event) => {
            const key = event.nativeEvent.key;
            if (key === ' ') {
                localPlayer.canPlaceBomb = true;
            }
        });
    }

    reconcileLocalPlayer(data) {
        const localPlayer = this.players.get(this.localPlayerId);
        if (!localPlayer) return;
        
        localPlayer.reconcileWithServer(data, this.networkManager);
    }

    update(timestamp) {
        // if (this.game.state.isPaused()) {
        //     this.players.forEach(p => {
        //         p.movement = false;
        //         p.render();
        //     });
        //     return;
        // }

        this.players.forEach(player => {
            player.updateRender(timestamp, this.game);
        });

        // Send local player movement to server
        const localPlayer = this.players.get(this.localPlayerId);
        if (localPlayer && localPlayer.alive && localPlayer.movement && (timestamp - this.lastServerUpdateTime > this.serverUpdateInterval)) {
            let direction = 'STOP';
            if (localPlayer.direction.includes('Up')) direction = 'UP';
            else if (localPlayer.direction.includes('Down')) direction = 'DOWN';
            else if (localPlayer.direction.includes('Left')) direction = 'LEFT';
            else if (localPlayer.direction.includes('Right')) direction = 'RIGHT';

            if (direction !== 'STOP' && localPlayer.sequenceNumber) {
                this.networkManager.sendPlayerMove(direction, localPlayer.sequenceNumber);
            }
            this.lastServerUpdateTime = timestamp;
        }
    }



    placeBomb(player) {
        if (!player.alive) return false;

        const activeBombs = this.getPlayerBombs(player.playerId);
        if (activeBombs >= player.bombCount) return false;

        if (this.game.remoteBombs) {
            for (const bomb of this.game.remoteBombs.values()) {
                if (bomb.gridX === player.gridX && bomb.gridY === player.gridY) {
                    return false;
                }
            }
        }

        this.networkManager.placeBomb();
        return true;
    }

    getPlayerBombs(playerId) {
        if (!this.game.remoteBombs) return 0;
        let count = 0;
        for (const bomb of this.game.remoteBombs.values()) {
            if (bomb.playerId === playerId) count++;
        }
        return count;
    }

    updateRemotePlayer(data) {
        const player = this.players.get(data.playerId);
        if (!player || player.isLocal) return;

        player.updateStateFromServer(data);
    }

    damagePlayer(playerId, livesRemaining) {
        const player = this.players.get(playerId);
        if (!player) return;

        player.lives = livesRemaining;
        // this.ui.showPlayerDamaged(playerId);

        if (player.lives <= 0) {
            this.killPlayer(playerId);
        }

        // this.updatePlayersUI();
    }

    killPlayer(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;

        player.alive = false;

        if (player.element) {
            player.element.style.opacity = '0.5';
            player.element.style.filter = 'grayscale(100%)';
        }

        // this.ui.showPlayerDied(playerId);
        this.checkWinCondition();
    }

    checkWinCondition() {
        const alivePlayers = Array.from(this.players.values()).filter(p => p.alive);

        if (alivePlayers.length <= 1) {
            const winner = alivePlayers[0];
            this.handleGameOver(winner);
        }
    }

    handleGameOver(winner) {
        // this.ui.showGameOver(winner);
    }

    handlePowerUpCollection(playerId, powerUpType, newStats) {
        const player = this.players.get(playerId);
        if (!player) return;

        player.updateStateFromServer(newStats);

        // this.ui.showPowerUpCollected(playerId, powerUpType);
        // this.updatePlayersUI();
    }

    // updatePlayersUI() {
    //     const playersArray = Array.from(this.players.values());
    //     // this.ui.updatePlayerList(playersArray);

    //     const localPlayer = playersArray.find(p => p.isLocal);
    //     if (localPlayer) {
    //         // this.ui.updateLocalPlayerStats(localPlayer);
    //     }
    // }

    cleanup() {
        this.players.forEach(player => player.remove());
        this.players.clear();
        // this.ui.cleanup();
    }
}
