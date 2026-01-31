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