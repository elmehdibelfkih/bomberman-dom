import { dom } from "../../framework/framework/index.js";
import * as consts from './consts.js';


export function throttle(cbf, wait) {
  let block = false
  return function (...args) {
    if (block) return
    block = true;
    cbf(...args)
    setTimeout(() => {
      block = false;
    }, wait)
  }
}

export function getCoordinates(map, target) {
  for (let i = 0; i < map.length; i++) {
    for (let j = 0; j < map[i].length; j++) {
      if (map[i][j] === target) {
        return [i, j];
      }
    }
  }

  return [null, null];
}

export function getGameContainer() {
  const gameContainer = dom({
    tag: 'div',
    attributes: { id: 'grid-container' },
    children: [
      {
        tag: 'div',
        attributes: { id: 'grid' },
        children: []
      }
    ]
  });
  return gameContainer;
}

export function getLobbyContainer() {
  const container = dom({
    tag: 'div',
    attributes: { class: 'page-container' },
    children: [
      {
        tag: 'div',
        attributes: { class: 'lobby-box' },
        children: [
          {
            tag: 'h1',
            attributes: {},
            children: ['GAME LOBBY']
          },
          {
            tag: 'div',
            attributes: { id: 'player-count' },
            children: ['Players: 0/4']
          },
          {
            tag: 'div',
            attributes: { id: 'player-list', class: 'player-list' },
            children: []
          },
          {
            tag: 'div',
            attributes: { id: 'countdown-display', class: 'countdown' },
            children: []
          },
          {
            tag: 'div',
            attributes: { class: 'chat-container' },
            children: [
              {
                tag: 'div',
                attributes: { id: 'chat-messages', class: 'chat-messages' },
                children: []
              },
              {
                tag: 'div',
                attributes: { class: 'chat-input-container' },
                children: [
                  {
                    tag: 'input',
                    attributes: {
                      type: 'text',
                      id: 'chat-input',
                      placeholder: 'Type a message...',
                      maxlength: '100'
                    },
                    children: []
                  },
                  {
                    tag: 'button',
                    attributes: { id: 'send-chat-btn' },
                    children: ['Send']
                  }
                ]
              }
            ]
          },
          {
            tag: 'button',
            attributes: {
              id: 'leave-lobby-btn',
              class: 'menu-btn'
            },
            children: ['LEAVE LOBBY']
          }
        ]
      }
    ]
  });
  return container
}

export function getControlsContainer() {
  const controlsContainer = dom({
    tag: 'div',
    attributes: { class: 'Controls' },
    children: [
      {
        tag: 'button',
        attributes: { id: 'sound' },
        children: [
          {
            tag: 'span',
            attributes: { id: 'volume-icon', style: 'font-size: 20px;' },
            children: ['🔊']
          }
        ]
      }
    ]
  });
  return controlsContainer;
}

export function getEntryPageContainer() {
  const container = dom({
    tag: 'div',
    attributes: { class: 'page-container' },
    children: [
      {
        tag: 'div',
        attributes: { class: 'menu-box' },
        children: [
          {
            tag: 'h1',
            attributes: {},
            children: ['MULTIPLAYER MODE']
          },
          {
            tag: 'p',
            attributes: { class: 'menu-subtitle' },
            children: ['Play with friends online']
          },
          {
            tag: 'input',
            attributes: {
              type: 'text',
              id: 'nickname-input',
              placeholder: 'Enter your nickname',
              maxlength: '10',
              autocomplete: 'off'
            },
            children: []
          },
          {
            tag: 'div',
            attributes: { id: 'error-message', class: 'error-message', style: 'display: none; color: var(--accent-color); margin: 0.5rem 0; font-size: 0.8rem;' },
            children: []
          },
          {
            tag: 'button',
            attributes: { id: 'join-btn', class: 'menu-btn' },
            children: ['JOIN GAME']
          },
          {
            tag: 'a',
            attributes: {
              href: '../index.html',
              class: 'menu-btn',
              style: 'margin-top: 1rem; text-decoration: none;'
            },
            children: ['BACK TO HOME']
          }
        ]
      }
    ]
  });
  return container;
}

export function showModal(title, message, onConfirm, onCancel) {
  const modalContainer = dom({
    tag: 'div',
    attributes: {
      class: 'modal-container',
      style: 'position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background-color: rgba(0, 0, 0, 0.5); display: flex; justify-content: center; align-items: center; z-index: 1000;'
    },
    children: [
      {
        tag: 'div',
        attributes: {
          class: 'modal-content',
          style: 'background-color: #333; color: white; padding: 2rem; border-radius: 8px; text-align: center; width: 350px; border: 1px solid #444; box-shadow: 0 5px 15px rgba(0,0,0,0.5);'
        },
        children: [
          {
            tag: 'h2',
            attributes: { style: 'margin-top: 0; color: #ff4757;' },
            children: [title]
          },
          {
            tag: 'p',
            attributes: { style: 'margin-bottom: 2rem;' },
            children: [message]
          },
          {
            tag: 'div',
            attributes: {
              class: 'modal-buttons',
              style: 'display: flex; justify-content: center; gap: 1rem;'
            },
            children: [
              {
                tag: 'button',
                attributes: { class: 'menu-btn' },
                children: ['Yes']
              },
              {
                tag: 'button',
                attributes: { class: 'menu-btn' },
                children: ['No']
              }
            ]
          }
        ]
      }
    ]
  });

  const [yesBtn, noBtn] = modalContainer.querySelectorAll('button');
  yesBtn.onclick = () => {
    if (onConfirm) onConfirm();
    document.body.removeChild(modalContainer);
  };
  noBtn.onclick = () => {
    if (onCancel) onCancel();
    document.body.removeChild(modalContainer);
  };

  document.body.appendChild(modalContainer);
}

export const createPlayerItem = (player) => {
  return dom({
    tag: 'div',
    attributes: { class: 'player-item', 'data-player-id': player.playerId },
    children: [
      { tag: 'span', attributes: { class: 'player-number' } },
      { tag: 'span', attributes: { class: 'player-nickname' } },
    ]
  });
}

export const createChatMessage = (nickname, text) => {
  return dom({
    tag: 'div',
    attributes: { class: 'chat-message' },
    children: [
      {
        tag: 'span',
        attributes: { class: 'chat-nickname' },
        children: [`${nickname}: `]
      },
      {
        tag: 'span',
        attributes: { class: 'chat-text' },
        children: [text]
      }
    ]
  });
}

export const createErrorScreen = (data) => {
  return dom({
    tag: 'div',
    attributes: { class: 'game-over-screen' },
    children: [
      {
        tag: 'div',
        attributes: { class: 'game-over-content error-content' },
        children: [
          {
            tag: 'h2',
            attributes: { class: 'game-over-title error-title' },
            children: ['Error']
          },
          {
            tag: 'p',
            attributes: { class: 'error-message' },
            children: [data.message || 'An unexpected error occurred']
          },
          {
            tag: 'button',
            attributes: {
              class: 'game-over-restart-btn',
              onclick: () => {
                window.location.replace('/');
              }
            },
            children: ['Back to Home']
          }
        ]
      }
    ]
  });
}

export const createGameOverScreen = (isWinner, winnerName) => {
  const gameOverScreen = dom({
    tag: 'div',
    attributes: { class: 'game-over-screen' },
    children: [
      {
        tag: 'div',
        attributes: { class: 'game-over-content' },
        children: [
          {
            tag: 'h2',
            attributes: {
              class: 'game-over-title',
              style: `color: ${isWinner ? 'var(--timer-color)' : 'var(--accent-color)'};`
            },
            children: [isWinner ? '🎉 CONGRATULATIONS! 🎉' : 'GAME OVER']
          },
          {
            tag: 'p',
            attributes: {
              class: 'game-over-message',
              style: 'font-size: 1.2rem; margin: 1rem 0; color: white;'
            },
            children: [isWinner ? `You are the champion!` : `Winner: ${winnerName}`]
          },
          {
            tag: 'p',
            attributes: {
              class: 'game-over-subtitle',
              style: `font-size: 0.9rem; color: ${isWinner ? 'var(--timer-color)' : '#888'}; margin-bottom: 2rem;`
            },
            children: [isWinner ? 'Well played!' : 'Better luck next time!']
          },
          {
            tag: 'button',
            attributes: {
              class: 'game-over-restart-btn',
              style: 'background: var(--accent-color); border: none; padding: 0.8rem 2rem; font-size: 1rem; font-family: "Press Start 2P", cursive; color: white; cursor: pointer; border-radius: 8px; transition: transform 0.2s, box-shadow 0.2s; box-shadow: 0 4px 15px rgba(0,0,0,0.3);',
              onclick: () => {
                window.location.href = '/';
                gameOverScreen.remove();
              },
              onmouseover: (e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 6px 20px rgba(0,0,0,0.4)';
              },
              onmouseout: (e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 15px rgba(0,0,0,0.3)';
              }
            },
            children: ['New Game']
          }
        ]
      }
    ]
  });
  return gameOverScreen;
}

export const createHeaderContainer = () => {
  return dom({
    tag: 'div',
    attributes: { id: 'header-container' },
    children: [
      {
        tag: 'div',
        attributes: { id: 'players-info', class: 'players-info' },
        children: [
          {
            tag: 'h3',
            attributes: {},
            children: ['Players']
          }
        ]
      }
    ]
  });
}

export const createGameChatMessage = (nickname, text) => {
  return dom({
    tag: 'div',
    attributes: { class: 'game-chat-message' },
    children: [
      {
        tag: 'span',
        attributes: { class: 'game-chat-nickname' },
        children: [`${nickname}: `]
      },
      {
        tag: 'span',
        attributes: { class: 'game-chat-text' },
        children: [text]
      }
    ]
  });
}

export const createPlayerCard = (player, playerIndex) => {
  const playerCard = dom({
    tag: 'div',
    attributes: {
      class: `player-card ${!player.alive ? 'dead' : ''} player-card-filter-${playerIndex}`,
      'data-player-id': player.playerId,
      'data-alive': player.alive
    },
    children: [
      {
        tag: 'div',
        attributes: { class: 'player-nickname' },
        children: [player.nickname]
      },
      {
        tag: 'div',
        attributes: { class: 'player-stats' },
        children: [
          {
            tag: 'div',
            attributes: { class: 'player-stat lives-stat' },
            children: [
              {
                tag: 'span',
                attributes: { class: 'stat-icon' },
                children: ['❤️']
              },
              {
                tag: 'span',
                attributes: { class: 'stat-value lives-value' },
                children: [player.lives.toString()]
              }
            ]
          },
          {
            tag: 'div',
            attributes: { class: 'player-stat bomb-stat' },
            children: [
              {
                tag: 'span',
                attributes: { class: 'stat-icon' },
                children: ['💣']
              },
              {
                tag: 'span',
                attributes: { class: 'stat-value bomb-value' },
                children: [player.bombCount.toString()]
              }
            ]
          },
          {
            tag: 'div',
            attributes: { class: 'player-stat range-stat' },
            children: [
              {
                tag: 'span',
                attributes: { class: 'stat-icon' },
                children: ['🔥']
              },
              {
                tag: 'span',
                attributes: { class: 'stat-value range-value' },
                children: [player.bombRange.toString()]
              }
            ]
          },
          {
            tag: 'div',
            attributes: { class: 'player-stat speed-stat' },
            children: [
              {
                tag: 'span',
                attributes: { class: 'stat-icon' },
                children: ['🚀']
              },
              {
                tag: 'span',
                attributes: { class: 'stat-value speed-value' },
                children: [player.speed.toString()]
              }
            ]
          }
        ]
      }
    ]
  });

  return playerCard;
}

export const createPingDisplay = () => {
  return dom({
    tag: 'div',
    attributes: {
      id: 'ping-display',
      class: 'ping-display'
    },
    children: ['Ping: ...']
  });
}

export const createBombElement = (id, xMap, yMap, size, image) => {
  const img = dom({
    tag: 'img',
    attributes: {
      src: image
    }
  });
  const bomb = dom({
    tag: 'div',
    attributes: {
      id: `bomb${id}`,
      style: `
                  opacity: 1;
                  position: absolute;
                  width: ${size}px;
                  height: ${size}px;
                  transform: translate(${xMap * size}px, ${yMap * size}px);
              `
    }
  });
  bomb.appendChild(img);
  return { bomb, img };
}

export const createExplosionElement = (direction, isExtended) => {
  const directionStyles = {
    'DOWN': isExtended ? 'translate(-68px, 43px)' : 'translate(-68px, 34px)',
    'LEFT': isExtended ? 'rotate(90deg) translate(-51px, 160px)' : 'rotate(90deg) translate(-17px, 119px)',
    'UP': isExtended ? 'rotate(180deg) translate(68px, 144px)' : 'rotate(180deg) translate(68px, 68px)',
    'RIGHT': isExtended ? 'rotate(270deg) translate(51px, 17px)' : 'rotate(270deg) translate(17px, -17px)'
  };
  return dom({
    tag: 'img',
    attributes: {
      style: `
                          position: absolute;
                          transform: ${directionStyles[direction]};
                      `
    }
  });
}

export const createGridElement = (mapData, createGridTiles) => {
  return dom({
    tag: 'div',
    attributes: {
      id: 'grid',
      style: `
        position: relative;
        width: ${mapData.initial_grid[0].length * mapData.block_size}px;
        height: ${mapData.initial_grid.length * mapData.block_size}px;
        border: 3px solid var(--accent-color);
        border-radius: var(--border-radius-sm);
        box-shadow: 0 0 20px rgba(255, 71, 87, 0.3), inset 0 0 10px var(--shadow-dark);
        background: var(--primary-bg);
      `
    },
    children: createGridTiles
  });
}

export const createGridContainerElement = () => {
  return dom({
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
}

export const createGridTileElement = (rowIndex, colIndex, tileSize, cell, mapData, createTileContent) => {
  return {
    tag: 'div',
    attributes: {
      'data-row-index': rowIndex,
      'data-col-index': colIndex,
      style: `
                          position: absolute;
                          width: ${tileSize}px;
                          height: ${tileSize}px;
                          background-size: cover;
                          background-image: url('${cell === consts.WALL ? mapData.wall : mapData.floor}');
                          transform: translate(${tileSize * rowIndex}px, ${tileSize * colIndex}px);
                      `
    },
    children: createTileContent(cell, rowIndex, colIndex)
  };
}

export const createTileContentElement = (mapData, rowIndex, colIndex) => {
  return {
    tag: 'img',
    attributes: {
      src: mapData.block,
      id: rowIndex.toString() + colIndex.toString(),
      style: `
                      width: 100%;
                      height: 100%;
                      image-rendering: pixelated;
                  `
    }
  };
}

export const createPowerUpElement = (powerupId, powerupType, mapData) => {
  const powerupImages = {
    8: mapData.bomb_img,
    9: mapData.flame_img,
    10: mapData.speed_img,
  };

  return dom({
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
}

export const createPlayerElement = (playerIndex, dyingSound) => {
  const player = dom({
    tag: 'div',
    attributes: {
      class: `player player-filter-${playerIndex}`
    }
  });
  player.appendChild(dyingSound);
  return player;
}

export const createPlayerExplosionElement = (x, y) => {
  const expSize = 64;
  return dom({
    tag: 'img',
    attributes: {
      style: `
                      position: absolute;
                      transform: translate(${(x - 20)}px, ${y}px);
                      width: ${expSize}px;
                      height: ${expSize}px;
                  `
    }
  })
}