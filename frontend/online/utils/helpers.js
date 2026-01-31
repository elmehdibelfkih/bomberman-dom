import { dom } from "../../framework/framework/index.js";

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
    attributes: { id: 'multiplayer-game-container' },
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
      },
      {
        tag: 'div',
        attributes: { id: 'game-chat', class: 'game-chat' },
        children: [
          {
            tag: 'div',
            attributes: { id: 'chat-messages-game', class: 'chat-messages-small' },
            children: []
          },
          {
            tag: 'input',
            attributes: {
              type: 'text',
              id: 'chat-input-game',
              placeholder: 'Press T to chat...',
              maxlength: '100',
              style: 'display: none;'
            },
            children: []
          }
        ]
      },
    ]
  });
  return gameContainer
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
                attributes: { id: 'star_pause' },
                children: [
                    {
                        tag: 'img',
                        attributes: { id: 'play-icon', src: './icon/play.svg', alt: 'star', width: '16', height: '16' }
                    }
                ]
            },
            {
                tag: 'button',
                attributes: { id: 'ref' },
                children: [
                    {
                        tag: 'img',
                        attributes: { id: 'rotate-icon', src: './icon/rotate-ccw.svg', alt: 'star', width: '16', height: '16' }
                    }
                ]
            },
            {
                tag: 'button',
                attributes: { id: 'sound' },
                children: [
                    {
                        tag: 'img',
                        attributes: { id: 'volume-icon', src: './icon/volume-2.svg', alt: 'voice', width: '16', height: '16' }
                    }
                ]
            }
        ]
    });
    return controlsContainer;
}

export function showModal(title, message, onConfirm, onCancel) {
    const modalContainer = dom({
        tag: 'div',
        attributes: {
            class: 'modal-container',
            style: `
                position: fixed;
                top: 0;
                left: 0;
                width: 100vw;
                height: 100vh;
                background-color: rgba(0, 0, 0, 0.5);
                display: flex;
                justify-content: center;
                align-items: center;
                z-index: 1000;
            `
        },
        children: [
            {
                tag: 'div',
                attributes: {
                    class: 'modal-content',
                    style: `
                        background-color: #333;
                        color: white;
                        padding: 2rem;
                        border-radius: 8px;
                        text-align: center;
                        width: 350px;
                        border: 1px solid #444;
                        box-shadow: 0 5px 15px rgba(0,0,0,0.5);
                    `
                },
                children: [
                    {
                        tag: 'h2',
                        attributes: {
                            style: `
                                margin-top: 0;
                                color: #ff4757;
                            `
                        },
                        children: [title]
                    },
                    {
                        tag: 'p',
                        attributes: {
                             style: `
                                margin-bottom: 2rem;
                            `
                        },
                        children: [message]
                    },
                    {
                        tag: 'div',
                        attributes: {
                            class: 'modal-buttons',
                            style: `
                                display: flex;
                                justify-content: center;
                                gap: 1rem;
                            `
                        },
                        children: [
                            {
                                tag: 'button',
                                attributes: { class: 'menu-btn' },
                                children: ['Yes'],
                                listeners: {
                                    click: () => {
                                        if (onConfirm) onConfirm();
                                        document.body.removeChild(modalContainer);
                                    }
                                }
                            },
                            {
                                tag: 'button',
                                attributes: { class: 'menu-btn' },
                                children: ['No'],
                                listeners: {
                                    click: () => {
                                        if (onCancel) onCancel();
                                        document.body.removeChild(modalContainer);
                                    }
                                }
                            }
                        ]
                    }
                ]
            }
        ]
    });

    document.body.appendChild(modalContainer);
}
