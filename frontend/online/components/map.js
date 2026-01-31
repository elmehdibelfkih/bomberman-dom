import * as consts from '../utils/consts.js';
import { dom, eventManager } from '../../framework/framwork/index.js';
import { Bomb } from "./bomb.js";
import { Bonus } from './bonus.js';

export class Map {

    constructor(game) {
        this.bonusArray = [];
        this.bonusArray.push(this.addTimeBonus.bind(this));
        this.bonusArray.push(this.addSpeedBonus.bind(this));
        this.bonusArray.push(this.addHeartBonus.bind(this));
        this.game = game;
        this.level = null;
        this.grid = null;
        this.gridArray = null;
        this.backGroundMusic = null;
        this.mustrender = false;
        this.updateLevel = false;
        this.bombs = [];
        this.loot = [];
        this.blocksToBlowing = [];
        this.tiles = [];
        this.blockElements = [];
        this.container = null;
    }

    static getInstance = (game) => Map.instance ? Map.instance : (Map.instance = new Map(game));

    async initMap() {
        this.level = await fetch(`../assets/maps/level${this.game.state.getLevel()}.json`).then(res => res.json());
        this.initGrid();
        this.initAudios();
    }

    initGrid() {
        // Remove existing grid if present
        if (this.grid && this.grid.parentNode) {
            this.grid.parentNode.removeChild(this.grid);
        }

        // Initialize grid array BEFORE creating DOM (needed for reactive children)
        this.gridArray = this.level.initial_grid.map(row => [...row]);

        // Create grid container using framework DOM
        this.grid = dom({
            tag: 'div',
            attributes: {
                id: 'grid',
                style: `
          position: relative;
          width: ${this.level.initial_grid[0].length * this.level.block_size}px;
          height: ${this.level.initial_grid.length * this.level.block_size}px;
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
        const tileSize = this.level.block_size;
        const gridTileConfigs = [];

        this.level.initial_grid.forEach((row, colIndex) => {
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
                            background-image: url('${cell === consts.WALL ? this.level.wall : this.level.floor}');
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
                    src: this.level.block,
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
        this.gridArray[y][x] = consts.FLOOR;
        let img = document.getElementById(x.toString() + y.toString());
        let tile = document.querySelector(`[data-row-index="${x}"][data-col-index="${y}"]`);
        this.game.state.setScore(25);
        if (tile && img) {
            tile.removeChild(img);
        }
        const randomIndex = Math.floor(Math.random() * this.bonusArray.length);
        if (tile) {
            this.bonusArray[randomIndex](x, y, tile);
        }
    }

    canPlayerMoveTo(x, y) {
        const blockSize = this.level.block_size;
        const width = this.game.player.getPlayerWidth();
        const height = this.game.player.getPlayerHeight();
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
    isBlock = (x, y) => this.gridArray[y][x] === consts.BLOCK;
    isFreeSpaceInGrid = (x, y) => this.gridArray[y][x] !== consts.BLOCK && this.gridArray[y][x] !== consts.WALL;

    addBomb(x, y, timestamp) {
        if (this.game.state.getBombCount() < this.game.state.getMaxAllowdBombCount())
            this.bombs.push(new Bomb(this.game, x, y, timestamp));
    }

    addSpeedBonus(xMap, yMap, node) {
        if (!node) return;
        const x = xMap * this.level.block_size;
        const y = yMap * this.level.block_size;
        const bonus = dom({
            tag: 'img',
            attributes: {
                src: this.level.speed_img,
                class: 'speed-bonus',
                id: xMap.toString() + yMap.toString() + "T",
                style: `
                    width: 30px;
                    height: 40px;
                    position: absolute;
                    transform: translate(20px, 10px);
                `
            }
        });

        const speedBonus = new Bonus(this.game, x, y, this.level, bonus.id, 'speed');
        speedBonus.originalWidth = 30;
        speedBonus.originalHeight = 40;
        this.loot.push(speedBonus);
        node.appendChild(bonus);
    }

    addTimeBonus(xMap, yMap, node) {
        if (!node) return;
        const x = xMap * this.level.block_size;
        const y = yMap * this.level.block_size;
        const bonus = dom({
            tag: 'img',
            attributes: {
                src: this.level.time_img,
                class: 'time-bonus',
                id: xMap.toString() + yMap.toString() + "T",
                style: `
                    width: 35px;
                    height: 50px;
                    position: absolute;
                    transform: translate(15px, 10px);
                `
            }
        });

        const timeBonus = new Bonus(this.game, x, y, this.level, bonus.id, 'time');
        timeBonus.originalWidth = 35;
        timeBonus.originalHeight = 50;
        this.loot.push(timeBonus);
        node.appendChild(bonus);
    }

    addHeartBonus(xMap, yMap, node) {
        if (!node) return;
        const x = xMap * this.level.block_size;
        const y = yMap * this.level.block_size;
        const bonus = dom({
            tag: 'img',
            attributes: {
                src: this.level.heart_img,
                class: 'heart-bonus',
                id: xMap.toString() + yMap.toString() + "T",
                style: `
                    width: 30px;
                    height: 40px;
                    position: absolute;
                    transform: translate(20px, 10px);
                `
            }
        });

        const heartBonus = new Bonus(this.game, x, y, this.level, bonus.id, 'heart');
        heartBonus.originalWidth = 30;
        heartBonus.originalHeight = 40;
        this.loot.push(heartBonus);
        node.appendChild(bonus);
    }

    initAudios() {
        if (!this.grid) return;
        this.backGroundMusic = new Audio(this.level.back_ground_music);
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

