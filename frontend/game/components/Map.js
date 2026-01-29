import * as consts from '../utils/consts.js';
import { Bomb } from "./Bomb.js"
import { Enemy } from "./Enemy.js"
import { Bonus } from './Bonus.js';
import { dom, eventManager } from '../../framework/index.js';

export class Map {

    constructor(game) {
        this.bonusArray = []
        this.bonusArray.push(this.addTimeBonus.bind(this))
        this.bonusArray.push(this.addSpeedBonus.bind(this))
        this.bonusArray.push(this.addHeartBonus.bind(this))
        this.game = game
        this.level
        this.grid
        this.gridArray
        this.backGroundMusic
        this.mustrender = false
        this.updateLevel = false
        this.bombs = []
        this.enemys = []
        this.loot = []
        this.blocksToBlowing = []
        this.enemyCordination
        this.tiles = [];
        this.blockElements = [];
        this.backGroundMusic;
        this.container = dom({ 
            tag: "div",
            attributes: { id: "grid-container" },
            children: [] 
        });
        document.body.appendChild(this.container)
    }

    static getInstance = (game) => Map.instance ? Map.instance : new Map(game)

    async initMap(mapData = null) {
        if (mapData) {
            this.level = mapData;
        } else {
            this.level = await fetch(`/game/assets/maps/level${this.game.state.getLevel()}.json`).then(res => res.json());
        }
        this.enemyCordination = await fetch(`/game/assets/enemycordinate.json`).then(res => res.json())

        // Fix relative paths in level data to absolute paths
        this.fixAssetPaths();

        this.initGrid()
        // todo
        // this.initAudios()
    }

    fixAssetPaths() {
        // Convert all relative asset paths to absolute paths
        const pathKeys = [
            'enemy', 'player', 'wall', 'floor', 'block', 'bomb',
            'electric_shock_img', 'player_explosion_img',
            'back_ground_music', 'shock_sound', 'dying_sound',
            'time_img', 'speed_img', 'heart_img',
            'time_sound', 'speed_sound', 'heart_sound'
        ];

        pathKeys.forEach(key => {
            if (this.level[key] && this.level[key].startsWith('./')) {
                this.level[key] = '/game/' + this.level[key].substring(2);
            }
        });
    }

    blowingUpBlock(x, y) {
        this.gridArray[y][x] = consts.FLOOR
        let img = document.getElementById(x.toString() + y.toString())
        let container = document.getElementsByClassName(x.toString() + y.toString())
        this.game.state.setScore(25);
        container[0].removeChild(img)
        const randomIndex = Math.floor(Math.random() * this.bonusArray.length);
        this.bonusArray[randomIndex](x, y, container[0])
    }

    canPlayerMoveTo(x, y, width = null, height = null) {
        const blockSize = this.level.block_size;
        // Use provided width/height or get from player (for solo mode)
        const w = width !== null ? width : this.game.player.getPlayerWidth();
        const h = height !== null ? height : this.game.player.getPlayerHeight();
        const corners = [
            [x, y],
            [x + w, y],
            [x, y + h],
            [x + w, y + h]
        ];
        for (const [cx, cy] of corners) {
            const gridX = Math.floor(cx / blockSize);
            const gridY = Math.floor(cy / blockSize);
            if (!this.isFreeSpaceInGrid(gridX, gridY)) return false
        }
        return true;
    }

    Canmove = (row, col) => this.gridArray[row] && this.gridArray[row][col] === 0
    isBlock = (x, y) => this.gridArray[y][x] === consts.BLOCK
    isFreeSpaceInGrid = (x, y) => this.gridArray[y][x] !== consts.BLOCK && this.gridArray[y][x] !== consts.WALL

    isValidGridPosition(gridX, gridY) {
        if (gridY < 0 || gridY >= this.gridArray.length || gridX < 0 || gridX >= this.gridArray[0].length) {
            return false;
        }
        return this.gridArray[gridY][gridX] !== consts.BLOCK && this.gridArray[gridY][gridX] !== consts.WALL;
    }

    // todo: change the timestamp to performence.now
    addBomb(x, y, timestamp) {
        if (this.game.state.getBombCount() < this.game.state.getMaxAllowdBombCount())
            this.bombs.push(new Bomb(this.game, x, y, timestamp))
    }

    initGrid() {
        this.gridArray = this.level.initial_grid.map(row => [...row])
        if (this.grid) this.container.removeChild(this.grid)

        const rows = this.level.initial_grid.length;
        const cols = this.level.initial_grid[0].length;
        const tileSize = this.level.block_size;
        const gridWidth = cols * tileSize;
        const gridHeight = rows * tileSize;

        // Build tiles array as virtual nodes
        const tilesVNodes = [];
        this.level.initial_grid.forEach((row, colIndex) => {
            row.forEach((cell, rowIndex) => {
                // Prepare children for this tile
                const tileChildren = [];

                // Add block image if this is a block cell
                if (cell === consts.BLOCK) {
                    tileChildren.push({
                        tag: "img",
                        attributes: {
                            src: this.level.block,
                            id: rowIndex.toString() + colIndex.toString()
                        },
                        children: []
                    });
                }

                // Create tile virtual node
                tilesVNodes.push({
                    tag: "div",
                    attributes: {
                        class: cell === consts.BLOCK ? rowIndex.toString() + colIndex.toString() : "",
                        "data-row-index": rowIndex,
                        "data-col-index": colIndex,
                        style: `position: absolute; transform: translate(${this.level.block_size * rowIndex}px, ${this.level.block_size * colIndex}px); background-image: ${cell === consts.WALL ? `url(${this.level.wall})` : `url(${this.level.floor})`}; width: ${this.level.block_size}px; height: ${this.level.block_size}px; background-size: cover;`
                    },
                    children: tileChildren
                });
            });
        });

        // Create grid with all tiles as children
        this.grid = dom({
            tag: "div",
            attributes: {
                id: "grid",
                style: `position: relative; width: ${gridWidth}px; height: ${gridHeight}px;`
            },
            children: tilesVNodes
        });

        this.container.appendChild(this.grid);

        // Store references to tiles and blocks
        Array.from(this.grid.children).forEach(tile => {
            this.tiles.push(tile);
            const blockImg = tile.querySelector('img');
            if (blockImg) {
                this.blockElements.push(blockImg);
            }
        });

        // Handle player and enemy spawning
        this.level.initial_grid.forEach((row, colIndex) => {
            row.forEach((cell, rowIndex) => {
                // Handle player position marker
                if (cell === consts.PLAYER) {
                    this.gridArray[colIndex][rowIndex] = 0
                }
                // Handle enemy spawning
                if (cell === consts.ENEMY) {
                    this.gridArray[colIndex][rowIndex] = 0
                    const x = this.level.block_size * rowIndex + 12
                    const y = this.level.block_size * colIndex + 15

                    const enemyDiv = dom({
                        tag: 'div',
                        attributes: {
                            class: 'enemy',
                            style: `background-image: url(${this.level.enemy}); background-repeat: no-repeat; image-rendering: pixelated; z-index: 1; position: absolute; width: ${this.enemyCordination["Left"].width}; height: ${this.enemyCordination["Left"].height}; background-position: ${this.enemyCordination["Left"].x}px ${this.enemyCordination["Left"].y}px; transform: translate(${x}px, ${y}px);`
                        },
                        children: []
                    });

                    this.grid.appendChild(enemyDiv);

                    const en = new Enemy(this.game, this.level, x, y, this.enemyCordination);
                    en.Div = enemyDiv;
                    en.originalX = x;
                    en.originalY = y;
                    en.originalWidth = parseInt(this.enemyCordination["Left"].width);
                    en.originalHeight = parseInt(this.enemyCordination["Left"].height);
                    this.enemys.push(en);
                }
            });
        });
    }

    addSpeedBonus(xMap, yMap, node) {
        const x = this.level.block_size * xMap;
        const y = this.level.block_size * yMap;
        const bonusId = xMap.toString() + yMap.toString() + "T";

        const bonus = dom({
            tag: "img",
            attributes: {
                src: this.level.speed_img,
                class: "speed-bonus",
                id: bonusId,
                style: "width: 30px; height: 40px; position: absolute; transform: translate(20px, 10px);"
            },
            children: []
        });

        const Bamboleao = new Bonus(this.game, x, y, this.level, bonusId, 'speed');
        Bamboleao.originalWidth = 30;
        Bamboleao.originalHeight = 40;
        this.loot.push(Bamboleao);
        node.appendChild(bonus);
    }

    addTimeBonus(xMap, yMap, node) {
        const x = this.level.block_size * xMap;
        const y = this.level.block_size * yMap;
        const bonusId = xMap.toString() + yMap.toString() + "T";

        const bonus = dom({
            tag: "img",
            attributes: {
                src: this.level.time_img,
                class: "time-bonus",
                id: bonusId,
                style: "width: 35px; height: 50px; position: absolute; transform: translate(15px, 10px);"
            },
            children: []
        });

        const timeBonus = new Bonus(this.game, x, y, this.level, bonusId, 'time');
        timeBonus.originalWidth = 35;
        timeBonus.originalHeight = 50;
        this.loot.push(timeBonus);
        node.appendChild(bonus);
    }

    addHeartBonus(xMap, yMap, node) {
        const x = this.level.block_size * xMap;
        const y = this.level.block_size * yMap;
        const bonusId = xMap.toString() + yMap.toString() + "T";

        const bonus = dom({
            tag: "img",
            attributes: {
                src: this.level.heart_img,
                class: "heart-bonus",
                id: bonusId,
                style: "width: 30px; height: 40px; position: absolute; transform: translate(20px, 10px);"
            },
            children: []
        });

        const Bamboleao = new Bonus(this.game, x, y, this.level, bonusId, 'heart');
        Bamboleao.originalWidth = 30;
        Bamboleao.originalHeight = 40;
        this.loot.push(Bamboleao);
        node.appendChild(bonus);
    }

    initAudios() {
        // Stop and remove old background music if it exists
        if (this.backGroundMusic) {
            this.backGroundMusic.pause();
            this.backGroundMusic.currentTime = 0;
            this.backGroundMusic.src = '';
            if (this.backGroundMusic.parentNode) {
                this.backGroundMusic.parentNode.removeChild(this.backGroundMusic);
            }
            this.backGroundMusic = null;
        }
        
        this.backGroundMusic = new Audio(this.level.back_ground_music);
        this.grid.appendChild(this.backGroundMusic);
        this.backGroundMusic.preload = 'auto';
        this.backGroundMusic.loop = true;
        const soundOn = this.game.state.isSoundOn();
        this.backGroundMusic.volume = soundOn ? 0.3 : 0.0;

        // Play music immediately if sound is on
        if (soundOn) {
            this.backGroundMusic.play().catch(err => {
                console.error("Playback failed:", err);
            });
        }

        this.game.state.updateSoundIcon();
    }

    destructeur = () => {
        if (this.backGroundMusic) {
            this.backGroundMusic.pause();
            this.backGroundMusic.currentTime = 0;
            this.backGroundMusic.src = '';
            this.backGroundMusic = null;
        }
        document.body.removeChild(this.container);
    }
}
