import * as consts from '../utils/consts.js'
import { dom } from '../../framwork/index.js'

export class MultiplayerMap {
    constructor(game) {
        this.game = game
        this.level = null
        this.gridArray = null
        this.container = dom({ 
            tag: 'div', 
            attributes: { id: 'multiplayer-grid-container' }, 
            children: [] 
        })
        document.body.appendChild(this.container)
        this.grid = null
        this.tiles = []
        this.blockElements = []
    }

    async initMultiplayerMap(mapData) {
        if (!mapData) {
            throw new Error('Map data is required for multiplayer')
        }
        
        this.level = mapData
        this.fixAssetPaths()
        this.initGrid()
    }

    fixAssetPaths() {
        const pathKeys = [
            'enemy', 'player', 'wall', 'floor', 'block', 'bomb',
            'electric_shock_img', 'player_explosion_img',
            'back_ground_music', 'shock_sound', 'dying_sound',
            'time_img', 'speed_img', 'heart_img',
            'time_sound', 'speed_sound', 'heart_sound'
        ]

        pathKeys.forEach(key => {
            if (this.level[key] && this.level[key].startsWith('./')) {
                this.level[key] = '/game/' + this.level[key].substring(2)
            }
        })
    }

    initGrid() {
        this.gridArray = this.level.initial_grid.map(row => [...row])
        if (this.grid) this.container.removeChild(this.grid)

        const rows = this.level.initial_grid.length
        const cols = this.level.initial_grid[0].length
        const tileSize = this.level.block_size
        const gridWidth = cols * tileSize
        const gridHeight = rows * tileSize

        const tilesVNodes = []
        this.level.initial_grid.forEach((row, colIndex) => {
            row.forEach((cell, rowIndex) => {
                const tileChildren = []

                if (cell === consts.BLOCK) {
                    tileChildren.push({
                        tag: 'img',
                        attributes: {
                            src: this.level.block,
                            id: rowIndex.toString() + colIndex.toString()
                        },
                        children: []
                    })
                }

                tilesVNodes.push({
                    tag: 'div',
                    attributes: {
                        class: cell === consts.BLOCK ? rowIndex.toString() + colIndex.toString() : '',
                        'data-row-index': rowIndex,
                        'data-col-index': colIndex,
                        style: `position: absolute; transform: translate(${this.level.block_size * rowIndex}px, ${this.level.block_size * colIndex}px); background-image: ${cell === consts.WALL ? `url(${this.level.wall})` : `url(${this.level.floor})`}; width: ${this.level.block_size}px; height: ${this.level.block_size}px; background-size: cover;`
                    },
                    children: tileChildren
                })
            })
        })

        this.grid = dom({
            tag: 'div',
            attributes: {
                id: 'multiplayer-grid',
                style: `position: relative; width: ${gridWidth}px; height: ${gridHeight}px;`
            },
            children: tilesVNodes
        })

        this.container.appendChild(this.grid)

        Array.from(this.grid.children).forEach(tile => {
            this.tiles.push(tile)
            const blockImg = tile.querySelector('img')
            if (blockImg) {
                this.blockElements.push(blockImg)
            }
        })
    }

    canPlayerMoveTo(x, y) {
        const blockSize = this.level.block_size
        const width = this.game.player.getPlayerWidth()
        const height = this.game.player.getPlayerHeight()
        const corners = [
            [x, y],
            [x + width, y],
            [x, y + height],
            [x + width, y + height]
        ]
        for (const [cx, cy] of corners) {
            const gridX = Math.floor(cx / blockSize)
            const gridY = Math.floor(cy / blockSize)
            if (!this.isFreeSpaceInGrid(gridX, gridY)) return false
        }
        return true
    }

    isFreeSpaceInGrid = (x, y) => this.gridArray[y][x] !== consts.BLOCK && this.gridArray[y][x] !== consts.WALL

    blowingUpBlock(x, y) {
        this.gridArray[y][x] = consts.FLOOR
        let img = document.getElementById(x.toString() + y.toString())
        let container = document.getElementsByClassName(x.toString() + y.toString())
        if (img && container[0]) {
            container[0].removeChild(img)
        }
    }

    updateFromServer(grid) {
        if (grid && this.level) {
            this.level.initial_grid = grid
            this.gridArray = grid.map(row => [...row])
        }
    }

    destructeur = () => {
        if (this.container && document.body.contains(this.container)) {
            document.body.removeChild(this.container)
        }
    }
}