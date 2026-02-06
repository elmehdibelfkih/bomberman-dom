import * as consts from '../utils/consts.js';
import { eventManager } from '../../framework/framework/index.js';
import { Bomb } from "./bomb.js";
import { createGridElement, createGridContainerElement, createGridTileElement, createTileContentElement, createPowerUpElement } from '../utils/helpers.js';

export class Map {
    constructor(game, mapData) {
        this.mapData = mapData;
        this.game = game;
        this.grid = null;
        this.gridArray = null;
        this.backGroundMusic = null;
        this.mustrender = false;
        this.updateLevel = false;
        this.bombs = [];
        this.tiles = [];
        this.blockElements = [];
        this.container = null;
    }
    static getInstance = (game, mapData) => {
        if (!Map.instance || mapData) {
            Map.instance = new Map(game, mapData);
        }
        return Map.instance;
    }

    static resetInstance() {
        Map.instance = null;
    }

    initMap() {
        this.initGrid();
        this.initAudios();
    }

    initGrid() {
        // Remove existing grid if present
        if (this.grid && this.grid.parentNode) {
            this.grid.parentNode.removeChild(this.grid);
        }

        // Initialize grid array BEFORE creating DOM (needed for reactive children)
        this.gridArray = this.mapData.initial_grid.map(row => [...row]);

        // Create grid container using framework DOM
        this.grid = createGridElement(this.mapData, () => this.createGridTiles());

        // Create container if not exists
        if (!this.container) {
            this.container = createGridContainerElement();
            this.container.appendChild(this.grid);
            document.body.insertBefore(this.container, document.body.firstChild);
        } else {
            this.container.innerHTML = '';
            this.container.appendChild(this.grid);
        }
    }

    createGridTiles() {
        this.tiles = [];
        this.blockElements = [];
        const tileSize = this.mapData.block_size;
        const gridTileConfigs = [];

        this.mapData.initial_grid.forEach((row, colIndex) => {
            row.forEach((cell, rowIndex) => {
                const tileConfig = createGridTileElement(rowIndex, colIndex, tileSize, cell, this.mapData, (cell, rowIndex, colIndex) => this.createTileContent(cell, rowIndex, colIndex));
                gridTileConfigs.push(tileConfig);
            });
        });

        return gridTileConfigs;
    }

    createTileContent(cell, rowIndex, colIndex) {
        const childrenConfigs = [];

        // Add blocks
        if (cell === consts.BLOCK) {
            const blockImgConfig = createTileContentElement(this.mapData, rowIndex, colIndex);
            childrenConfigs.push(blockImgConfig);
        }

        return childrenConfigs;
    }

    blowingUpBlock(x, y) {
        if (!this.gridArray[y]) return;
        this.gridArray[y][x] = consts.FLOOR;
        let img = document.getElementById(x.toString() + y.toString());
        let tile = document.querySelector(`[data-row-index="${x}"][data-col-index="${y}"]`);
        if (tile && img) {
            tile.removeChild(img);
        }
        // No local powerup spawning in multiplayer - server handles this
    }

    spawnPowerUp(powerupId, powerupType, gridX, gridY) {
        if (!this.grid) return;

        const tiles = Array.from(this.grid.children);
        const tile = tiles.find(t =>
            t.dataset.rowIndex === String(gridX) &&
            t.dataset.colIndex === String(gridY)
        );
        if (!tile) return;

        const powerup = createPowerUpElement(powerupId, powerupType, this.mapData);

        tile.appendChild(powerup);
    }

    canPlayerMoveTo(player, x, y) {
        const blockSize = this.mapData.block_size;
        const width = player.getPlayerWidth();
        const height = player.getPlayerHeight();
        const corners = [
            [x, y],
            [x + width, y],
            [x, y + height],
            [x + width, y + height]
        ];

        for (const [cx, cy] of corners) {
            const gridX = Math.floor(cx / blockSize);
            const gridY = Math.floor(cy / blockSize);
            if (!this.isFreeSpaceInGrid(gridX, gridY)) return false;
        }
        return true;
    }

    Canmove = (row, col) => this.gridArray[row] && this.gridArray[row][col] === 0;
    isBlock = (x, y) => this.gridArray[y] && this.gridArray[y][x] === consts.BLOCK;
    isWall = (x, y) => this.gridArray[y] && this.gridArray[y][x] === consts.WALL;

    isFreeSpaceInGrid = (x, y) => this.gridArray[y] && this.gridArray[y][x] !== consts.BLOCK && this.gridArray[y][x] !== consts.WALL;

    addBomb(playerId, xMap, yMap) {
        let player = this.game.players.get(playerId)
        if (!player) return;
        this.bombs.push(new Bomb(this.game, player, xMap, yMap));
    }

    initAudios() {
        if (!this.grid) return;
        this.backGroundMusic = new Audio(this.mapData.back_ground_music);
        this.grid.appendChild(this.backGroundMusic)
        this.backGroundMusic.preload = 'auto';
        this.backGroundMusic.loop = true;
        const soundOn = this.game.state.isSoundOn();
        this.backGroundMusic.volume = soundOn ? 0.3 : 0.0;
        const playMusic = () => {
            this.backGroundMusic.play().catch(err => {
                console.error("Playback failed:", err);
            });
            eventManager.linkNodeToHandlers(document.body, 'click', null);
            eventManager.linkNodeToHandlers(document.body, 'keydown', null);
        };
        eventManager.linkNodeToHandlers(document.body, 'click', playMusic);
        eventManager.linkNodeToHandlers(document.body, 'keydown', playMusic);
        this.game.state.updateSoundIcon();
    }

    destructor = () => {
        if (this.container && this.container.parentNode) {
            this.container.parentNode.removeChild(this.container);
        }
    }
}