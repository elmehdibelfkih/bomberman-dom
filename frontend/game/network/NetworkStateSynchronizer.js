export class NetworkStateSynchronizer {
    constructor(game, networkManager) {
        this.game = game;
        this.networkManager = networkManager;
        this.lastServerUpdate = 0;
        this.interpolationBuffer = [];
        this.maxBufferSize = 3;
        this.clientPrediction = true;
    }

    // Handle authoritative state updates from server
    handleFullState(data) {
        this.lastServerUpdate = data.timestamp || Date.now();
        
        // Update players from authoritative state
        if (data.players) {
            this.syncPlayers(data.players);
        }
        
        // Update bombs
        if (data.bombs) {
            this.syncBombs(data.bombs);
        }
        
        // Update power-ups
        if (data.powerups) {
            this.syncPowerUps(data.powerups);
        }
        
        // Update map state
        if (data.grid) {
            this.syncMapState(data.grid);
        }
    }

    // Sync player positions with server authority
    syncPlayers(serverPlayers) {
        if (!this.game.playerManager) return;
        
        serverPlayers.forEach(serverPlayer => {
            const localPlayer = this.game.playerManager.players.get(serverPlayer.playerId);
            if (!localPlayer) return;
            
            // For remote players, always use server position
            if (!localPlayer.isLocal) {
                this.updatePlayerPosition(localPlayer, serverPlayer);
            } else {
                // For local player, use server reconciliation
                this.reconcileLocalPlayer(localPlayer, serverPlayer);
            }
            
            // Update stats
            localPlayer.lives = serverPlayer.lives;
            localPlayer.speed = serverPlayer.speed;
            localPlayer.bombCount = serverPlayer.bombCount;
            localPlayer.bombRange = serverPlayer.bombRange;
            localPlayer.alive = serverPlayer.alive;
        });
        
        this.game.playerManager.updatePlayersUI();
    }

    // Update player visual position
    updatePlayerPosition(localPlayer, serverPlayer) {
        localplayer.gridX = serverplayer.gridX;
        localplayer.gridY = serverplayer.gridY;
        localplayer.gridX = serverplayer.gridX * this.game.map.blockSize;
        localplayer.gridY = serverplayer.gridY * this.game.map.blockSize;
        
        if (localPlayer.element) {
            localPlayer.element.style.transform = `translate(${localplayer.gridX}px, ${localplayer.gridY}px)`;
        }
    }

    // Client-side prediction reconciliation
    reconcileLocalPlayer(localPlayer, serverPlayer) {
        const positionDiff = Math.abs(localplayer.gridX - serverplayer.gridX) + 
                           Math.abs(localplayer.gridY - serverplayer.gridY);
        
        // If significant difference, snap to server position
        if (positionDiff > 1) {
            console.log('Position correction applied');
            this.updatePlayerPosition(localPlayer, serverPlayer);
        }
    }

    // Sync bombs with server state
    syncBombs(serverBombs) {
        if (!this.game.remoteBombs) return;
        
        // Remove bombs that no longer exist on server
        const serverBombIds = new Set(serverBombs.map(bomb => bomb.bombId));
        for (const [bombId, bomb] of this.game.remoteBombs.entries()) {
            if (!serverBombIds.has(bombId)) {
                if (bomb.element && bomb.element.parentNode) {
                    bomb.element.remove();
                }
                this.game.remoteBombs.delete(bombId);
            }
        }
        
        // Add/update bombs from server
        serverBombs.forEach(serverBomb => {
            if (!this.game.remoteBombs.has(serverBomb.bombId)) {
                this.createBombElement(serverBomb);
            }
        });
    }

    // Sync power-ups with server state
    syncPowerUps(serverPowerUps) {
        // Remove power-ups that no longer exist
        const existingPowerUps = document.querySelectorAll('.power-up');
        const serverPowerUpIds = new Set(serverPowerUps.map(p => p.powerupId));
        
        existingPowerUps.forEach(element => {
            const powerUpId = element.id.replace('powerup-', '');
            if (!serverPowerUpIds.has(powerUpId)) {
                element.remove();
            }
        });
        
        // Add new power-ups
        serverPowerUps.forEach(powerUp => {
            if (!document.getElementById(`powerup-${powerUp.powerupId}`)) {
                this.createPowerUpElement(powerUp);
            }
        });
    }

    // Create bomb visual element
    createBombElement(bombData) {
        const bombElement = document.createElement('div');
        bombElement.className = 'remote-bomb';
        bombElement.id = `remote-bomb-${bombData.bombId}`;
        bombElement.style.cssText = `
            position: absolute;
            width: ${this.game.map.blockSize}px;
            height: ${this.game.map.blockSize}px;
            left: ${bombData.gridX * this.game.map.blockSize}px;
            top: ${bombData.gridY * this.game.map.blockSize}px;
            background: url('/game/assets/bomb/bomb.png') no-repeat center;
            background-size: cover;
            z-index: 5;
        `;
        
        document.getElementById('grid').appendChild(bombElement);
        
        this.game.remoteBombs.set(bombData.bombId, {
            bombId: bombData.bombId,
            element: bombElement,
            gridX: bombData.gridX,
            gridY: bombData.gridY,
            range: bombData.range
        });
    }

    // Create power-up visual element
    createPowerUpElement(powerUpData) {
        const powerUpElement = document.createElement('div');
        powerUpElement.className = 'power-up';
        powerUpElement.id = `powerup-${powerUpData.powerupId}`;
        
        const iconMap = {
            'SPEED': '⚡',
            'BOMB_COUNT': '💣',
            'BOMB_RANGE': '🔥'
        };
        
        powerUpElement.style.cssText = `
            position: absolute;
            width: ${this.game.map.blockSize}px;
            height: ${this.game.map.blockSize}px;
            left: ${powerUpData.gridX * this.game.map.blockSize}px;
            top: ${powerUpData.gridY * this.game.map.blockSize}px;
            background: rgba(255, 215, 0, 0.8);
            border: 2px solid #ffd700;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 24px;
            z-index: 8;
            animation: powerUpPulse 1s infinite;
        `;
        
        powerUpElement.textContent = iconMap[powerUpData.powerupType] || '?';
        document.getElementById('grid').appendChild(powerUpElement);
    }

    // Sync map state (destroyed blocks)
    syncMapState(serverGrid) {
        if (!this.game.map || !this.game.map.gridArray) return;
        
        // Update local grid to match server
        for (let y = 0; y < serverGrid.length; y++) {
            for (let x = 0; x < serverGrid[y].length; x++) {
                if (this.game.map.gridArray[y] && 
                    this.game.map.gridArray[y][x] !== serverGrid[y][x]) {
                    
                    this.game.map.gridArray[y][x] = serverGrid[y][x];
                    
                    // Remove visual block if destroyed
                    if (serverGrid[y][x] === 0) {
                        const blockElement = document.querySelector(`[data-grid-x="${x}"][data-grid-y="${y}"]`);
                        if (blockElement) {
                            blockElement.remove();
                        }
                    }
                }
            }
        }
    }

    // Handle network lag compensation
    compensateForLag(timestamp) {
        const now = Date.now();
        const timeSinceUpdate = now - this.lastServerUpdate;
        
        // If too much time has passed, request state update
        if (timeSinceUpdate > 1000) {
            this.requestStateUpdate();
        }
    }

    requestStateUpdate() {
        // Request fresh state from server
        this.networkManager.send({
            type: 'REQUEST_STATE_UPDATE'
        });
    }

    // Cleanup
    cleanup() {
        this.interpolationBuffer = [];
    }
}