import * as consts from '../utils/consts.js';
import { dom, eventManager } from '../../framework/framework/index.js';
import { Bomb } from "./bomb.js";

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
        this.grid = dom({
            tag: 'div',
            attributes: {
                id: 'grid',
                style: `
          position: relative;
          width: ${this.mapData.initial_grid[0].length * this.mapData.block_size}px;
          height: ${this.mapData.initial_grid.length * this.mapData.block_size}px;
          border: 3px solid var(--accent-color);
          border-radius: var(--border-radius-sm);
          box-shadow: 0 0 20px rgba(255, 71, 87, 0.3), inset 0 0 10px var(--shadow-dark);
          background: var(--primary-bg);
        `
            },
            children: () => this.createGridTiles()
        });

        // Create container if not exists
        if (!this.container) {
            this.container = dom({
                tag: 'div',
                attributes: {
                    id: 'grid-container',
                    style: `
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 1;
          `
                }
            });
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
                const tileConfig = {
                    tag: 'div',
                    attributes: {
                        'data-row-index': rowIndex,
                        'data-col-index': colIndex,
                        style: `
                            position: absolute;
                            width: ${tileSize}px;
                            height: ${tileSize}px;
                            background-size: cover;
                            background-image: url('${cell === consts.WALL ? this.mapData.wall : this.mapData.floor}');
                            transform: translate(${tileSize * rowIndex}px, ${tileSize * colIndex}px);
                        `
                    },
                    children: this.createTileContent(cell, rowIndex, colIndex)
                };
                gridTileConfigs.push(tileConfig);
            });
        });

        return gridTileConfigs;
    }

    createTileContent(cell, rowIndex, colIndex) {
        const childrenConfigs = [];

        // Add blocks
        if (cell === consts.BLOCK) {
            const blockImgConfig = {
                tag: 'img',
                attributes: {
                    src: this.mapData.block,
                    id: rowIndex.toString() + colIndex.toString(),
                    style: `
                        width: 100%;
                        height: 100%;
                        image-rendering: pixelated;
                    `
                }
            };
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

        const powerupImages = {
            8: this.mapData.bomb_img,
            9: this.mapData.flame_img,
            10: this.mapData.speed_img,
        };

        const powerup = dom({
            tag: 'img',
            attributes: {
                src: powerupImages[powerupType],
                id: powerupId,
                class: 'powerup',
                style: `
                    width: 30px;
                    height: 40px;
                    position: absolute;
                    transform: translate(20px, 10px);
                `
            }
        });

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
