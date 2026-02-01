import { dom } from '../../../framework/index.js';
import { CLIENT_CONFIG } from '../../config/client-config.js';
import { Board } from '../components/Board.js';
import { GameEngine } from '../../core/GameEngine.js';

export const GamePage = ({ mapData, players, yourPlayerId, onSendChat = () => {}, onPlaceBomb = () => {} }) => {
    // Initialize game engine with performance monitoring
    const gameEngine = new GameEngine();
    gameEngine.initialize(mapData, players);

    // Use Board component to render map and players
    const board = Board({ mapData, players, yourPlayerId });
    const page = dom({ tag: 'div', attributes: { class: 'game-page' } });
    page.appendChild(board.element);

    // Performance monitor (top-left corner)
    const perfMonitor = dom({ 
        tag: 'div', 
        attributes: { 
            class: 'perf-monitor', 
            style: 'position: fixed; left: 8px; top: 8px; background: rgba(0,0,0,0.7); color: #0f0; padding: 8px; font-family: monospace; font-size: 12px; z-index: 100; border-radius: 4px;' 
        } 
    });
    page.appendChild(perfMonitor);

    // Lives display (below performance monitor)
    const livesDisplay = dom({ 
        tag: 'div', 
        attributes: { 
            class: 'lives-display', 
            style: 'position: fixed; left: 8px; top: 50px; background: rgba(0,0,0,0.7); color: #ff4444; padding: 8px 12px; font-family: Arial, sans-serif; font-size: 16px; font-weight: bold; z-index: 100; border-radius: 4px;' 
        } 
    });
    page.appendChild(livesDisplay);

    // Update performance display
    function updatePerformanceDisplay() {
        const stats = gameEngine.getPerformanceStats();
        perfMonitor.innerHTML = `FPS: ${stats.fps} | Drops: ${stats.frameDrops}`;
    }
    
    // Update lives display
    function updateLivesDisplay() {
        // Get local player from the players passed to this component or from game state
        const localPlayer = players.find(p => p.playerId === yourPlayerId);
        const lives = localPlayer?.lives ?? 3;
        const heartsDisplay = '❤️'.repeat(Math.max(0, lives)) + '💀'.repeat(Math.max(0, 3 - lives));
        livesDisplay.innerHTML = `Lives: ${heartsDisplay}`;
    }
    
    // Update performance every second
    setInterval(updatePerformanceDisplay, 1000);
    
    // Update lives display initially and when players change
    updateLivesDisplay();
    setInterval(updateLivesDisplay, 500);

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

    // Place Bomb button (also accessible by Space key handled in InputManager)
    const placeBombBtn = dom({ tag: 'button', attributes: { class: 'btn', style: 'display:block; margin-top:8px;' }, children: ['Place Bomb'] });
    placeBombBtn.addEventListener('click', (e) => {
        e.preventDefault();
        onPlaceBomb();
    });
    chatContainer.appendChild(placeBombBtn);

    function updateChatMessage(msg) {
        addChatMessage(msg);
    }

    function updatePlayers(newPlayers) {
        if (board && board.updatePlayers) board.updatePlayers(newPlayers);
        updateLivesDisplay(); // Update lives when players change
    }

    function updateBombs(bombs) {
        if (board && board.updateBombs) board.updateBombs(bombs);
    }

    function updateBlocks(destroyedBlocks = [], explosions = []) {
        if (board && board.updateBlocks) board.updateBlocks(destroyedBlocks, explosions);
    }

    function updatePowerups(powerups = []) {
        if (board && board.updatePowerups) board.updatePowerups(powerups);
    }

    // End-game overlay and notifications
    const overlay = dom({ tag: 'div', attributes: { class: 'game-overlay', style: 'position:absolute; left:0; top:0; width:100%; height:100%; display:none; align-items:center; justify-content:center; z-index:100; background: rgba(0,0,0,0.6); color:#fff; font-size:28px; flex-direction:column;' } });
    const overlayText = dom({ tag: 'div', attributes: { style: 'margin-bottom:16px; font-weight:700;' }, children: [] });
    const overlayBtn = dom({ tag: 'button', attributes: { class: 'btn', style: 'padding:8px 12px;' }, children: ['Back to Home'] });
    overlayBtn.addEventListener('click', () => { window.location.reload(); });
    overlay.appendChild(overlayText);
    overlay.appendChild(overlayBtn);
    page.appendChild(overlay);

    const toast = dom({ tag: 'div', attributes: { class: 'game-toast', style: 'position: absolute; right: 16px; bottom: 16px; min-width: 160px; padding: 8px 12px; background: rgba(0,0,0,0.7); color:#fff; border-radius:6px; display:none; z-index:120;' }, children: [] });
    page.appendChild(toast);

    function showEndMessage(text) {
        overlayText.innerHTML = '';
        overlayText.appendChild(document.createTextNode(text));
        overlay.style.display = 'flex';
    }

    function hideEndMessage() {
        overlay.style.display = 'none';
    }

    function showNotification(text, duration = 2500) {
        toast.innerHTML = '';
        toast.appendChild(document.createTextNode(text));
        toast.style.display = 'block';
        setTimeout(() => { toast.style.display = 'none'; }, duration);
    }

    function showPowerUpNotification(powerUpType) {
        const powerUpNames = {
            'BOMB_COUNT': '💣 Extra Bomb!',
            'SPEED': '⚡ Speed Boost!',
            'BOMB_RANGE': '🔥 Bigger Explosions!',
            // Handle numeric constants from server
            8: '💣 Extra Bomb!',    // POWERUP_BOMB
            10: '⚡ Speed Boost!',     // POWERUP_SPEED
            9: '🔥 Bigger Explosions!' // POWERUP_FLAME
        };
        
        const message = powerUpNames[powerUpType];
        if (!message) {
            console.log('Unknown power-up type for notification:', powerUpType);
            return; // Skip unknown power-ups
        }
        
        const notification = dom({
            tag: 'div',
            attributes: {
                class: 'powerup-notification',
                style: 'position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%); background: rgba(0,0,0,0.9); color: #fff; padding: 20px 30px; border-radius: 15px; font-size: clamp(18px, 3vw, 24px); font-weight: bold; z-index: 200; animation: powerup-show 2s ease-out forwards; text-align: center; border: 2px solid #ffd700; box-shadow: 0 0 20px rgba(255,215,0,0.5);'
            },
            children: [message]
        });
        
        page.appendChild(notification);
        
        setTimeout(() => {
            if (notification.parentNode) {
                notification.parentNode.removeChild(notification);
            }
        }, 2000);
    }

    return { element: page, addChatMessage, updateChatMessage, chatInput, updatePlayers, updateBombs, updateBlocks, updatePowerups, showEndMessage, hideEndMessage, showNotification, showPowerUpNotification };
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
