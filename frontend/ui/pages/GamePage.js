import { dom } from '../../../framework/index.js';
import { CLIENT_CONFIG } from '../../config/client-config.js';

export const GamePage = ({ mapData, players, yourPlayerId, onSendChat = () => {} }) => {
    const cellSize = CLIENT_CONFIG.CELL_SIZE;
    const grid = mapData.initial_grid;

    const gameContainer = dom({
        tag: 'div',
        attributes: {
            id: 'game-container',
            style: `position: relative; width: ${CLIENT_CONFIG.CANVAS_WIDTH}px; height: ${CLIENT_CONFIG.CANVAS_HEIGHT}px; background: #000;`
        }
    });

    // Render map
    for (let y = 0; y < grid.length; y++) {
        for (let x = 0; x < grid[y].length; x++) {
            const cell = createCell(x, y, grid[y][x], cellSize);
            gameContainer.appendChild(cell);
        }
    }

    // Render players
    players.forEach(player => {
        const playerEl = createPlayer(player, cellSize, player.playerId === yourPlayerId);
        gameContainer.appendChild(playerEl);
    });

    const page = dom({
        tag: 'div',
        attributes: { class: 'game-page' }
    });

    page.appendChild(gameContainer);

    // Chat UI
    const chatContainer = dom({ tag: 'div', attributes: { class: 'game-chat', style: 'position: absolute; right: 8px; bottom: 8px; width: 300px; background: rgba(0,0,0,0.6); padding:8px; color:#fff; z-index:50;' } });
    const chatMessages = dom({ tag: 'div', attributes: { class: 'chat-messages', style: 'max-height: 160px; overflow-y:auto; margin-bottom:8px;' } });
    const chatForm = dom({ tag: 'form', attributes: { class: 'chat-form', style: 'display:flex; gap:8px;' } });
    const chatInput = dom({ tag: 'input', attributes: { type: 'text', placeholder: 'Say something...', class: 'chat-input', style: 'flex:1; padding:6px;' } });
    const sendBtn = dom({ tag: 'button', attributes: { type: 'submit', class: 'btn' }, children: ['Send'] });

    chatForm.appendChild(chatInput);
    chatForm.appendChild(sendBtn);
    chatContainer.appendChild(chatMessages);
    chatContainer.appendChild(chatForm);
    page.appendChild(chatContainer);

    function addChatMessage({ from, nickname, text }) {
        const msgEl = dom({ tag: 'div', attributes: { class: 'chat-message', style: 'margin-bottom:6px;' } });
        const nameEl = dom({ tag: 'span', attributes: { style: 'font-weight:700; color:#9ad;' }, children: [nickname || from] });
        const textEl = dom({ tag: 'span', attributes: { style: 'margin-left:6px; color:#fff;' }, children: [text] });
        msgEl.appendChild(nameEl);
        msgEl.appendChild(textEl);
        chatMessages.appendChild(msgEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const text = chatInput.value && chatInput.value.trim();
        if (!text) return;
        // send to server and wait for server broadcast to display (prevents duplication and ensures server nickname)
        onSendChat(text);
        chatInput.value = '';
    });

    function updateChatMessage(msg) {
        addChatMessage(msg);
    }

    return { element: page, addChatMessage, updateChatMessage };
};

function createCell(x, y, type, cellSize) {
    let color;
    switch (type) {
        case 0: color = '#90EE90'; break; // Floor
        case 1: color = '#4A4A4A'; break; // Wall
        case 2: color = '#8B4513'; break; // Block
        default: color = '#000';
    }

    return dom({
        tag: 'div',
        attributes: {
            class: `cell cell-${type}`,
            style: `position: absolute; left: ${x * cellSize}px; top: ${y * cellSize}px; width: ${cellSize}px; height: ${cellSize}px; background: ${color}; border: 1px solid #00000020;`
        }
    });
}

function createPlayer(player, cellSize, isLocal) {
    return dom({
        tag: 'div',
        attributes: {
            id: `player-${player.playerId}`,
            class: isLocal ? 'player local-player' : 'player remote-player',
            style: `position: absolute; left: ${player.x}px; top: ${player.y}px; width: ${cellSize}px; height: ${cellSize}px; background: ${isLocal ? '#00FF00' : '#FF0000'}; border-radius: 50%; z-index: 10;`
        },
        children: [
            dom({
                tag: 'div',
                attributes: {
                    style: 'position: absolute; top: -20px; left: 50%; transform: translateX(-50%); color: white; font-size: 12px; white-space: nowrap;'
                },
                children: [player.nickname]
            })
        ]
    });
}
