import { Router, dom, usePathname } from "../framwork/index.js";
import { Game } from "./engine/core.js";
import { createEffect } from "../framwork/state/signal.js";

// Initialize the router
const router = Router.instance;
router.initRouter();

// Get pathname signal
const pathname = usePathname();

// Menu Component
function MenuPage() {
    return dom({
        tag: 'div',
        attributes: {
            id: 'menu',
            role: 'region',
            class: 'page-container'
        },
        children: [
            {
                tag: 'div',
                attributes: { class: 'menu-box' },
                children: [
                    {
                        tag: 'h1',
                        attributes: { id: 'menu-title' },
                        children: ['🎮 Bomberman']
                    },
                    {
                        tag: 'p',
                        attributes: { class: 'menu-subtitle' },
                        children: ['Choose Your Game Mode']
                    },
                    {
                        tag: 'div',
                        attributes: { class: 'menu-buttons' },
                        children: [
                            {
                                tag: 'a',
                                attributes: {
                                    href: '/solo',
                                    class: 'menu-btn',
                                    'aria-label': 'Play solo'
                                },
                                children: ['SOLO PLAY']
                            },
                            {
                                tag: 'a',
                                attributes: {
                                    href: '/multi',
                                    class: 'menu-btn',
                                    'aria-label': 'Play multiplayer'
                                },
                                children: ['MULTIPLAYER']
                            }
                        ]
                    }
                ]
            }
        ]
    });
}

// Solo Game Page
async function SoloGamePage() {
    // Initialize game - components append themselves to document.body
    const game = Game.getInstance();
    window.game = game;

    await game.intiElements();

    while (!game.player || !game.player.playerCoordinate) {
        await new Promise(r => setTimeout(r, 0));
    }

    // Create level display and append to body
    const levelDisplay = dom({
        tag: 'div',
        attributes: { id: 'level-display' },
        children: []
    });
    document.body.appendChild(levelDisplay);

    // Create controls and append to body
    const controls = dom({
        tag: 'div',
        attributes: { class: 'Controls' },
        children: [
            {
                tag: 'button',
                attributes: { id: 'star_pause' },
                children: [
                    {
                        tag: 'img',
                        attributes: {
                            id: 'icon',
                            src: '/game/icon/play.svg',
                            alt: 'pause/play',
                            width: '16',
                            height: '16'
                        },
                        children: []
                    }
                ]
            },
            {
                tag: 'button',
                attributes: { id: 'ref' },
                children: [
                    {
                        tag: 'img',
                        attributes: {
                            id: 'icon',
                            src: '/game/icon/rotate-ccw.svg',
                            alt: 'restart',
                            width: '16',
                            height: '16'
                        },
                        children: []
                    }
                ]
            },
            {
                tag: 'button',
                attributes: { id: 'sound' },
                children: [
                    {
                        tag: 'img',
                        attributes: {
                            id: 'Icon',
                            src: '/game/icon/volume-2.svg',
                            alt: 'sound',
                            width: '16',
                            height: '16'
                        },
                        children: []
                    }
                ]
            }
        ]
    });
    document.body.appendChild(controls);

    // Start the game
    await game.waitForLevel();

    levelDisplay.textContent = `${game.map.level.name}`;
    levelDisplay.classList.add('show');

    game.state.stopTimer();
    game.state.resetTimer();
    game.state.setTime(game.map.level.level_time);
    game.state.startTimer();
    game.run();

    setTimeout(() => {
        game.state.pauseStart();
        levelDisplay.classList.remove('show');
    }, 2000);

    // Return null since game manages its own DOM
    return null;
}

// Import NetworkManager
import { NetworkManager } from './network/NetworkManager.js';
import { setupMultiplayerSync } from './network/MultiplayerSync.js';

// Multiplayer Page - Nickname Input
function MultiplayerPage() {
    const container = dom({
        tag: 'div',
        attributes: {
            id: 'multiplayer-container',
            class: 'page-container'
        },
        children: [
            {
                tag: 'div',
                attributes: { class: 'menu-box' },
                children: [
                    {
                        tag: 'h1',
                        attributes: {},
                        children: ['Multiplayer Mode']
                    },
                    {
                        tag: 'p',
                        attributes: { class: 'menu-subtitle' },
                        children: ['Enter your nickname to join']
                    },
                    {
                        tag: 'div',
                        attributes: { class: 'nickname-form' },
                        children: [
                            {
                                tag: 'input',
                                attributes: {
                                    type: 'text',
                                    id: 'nickname-input',
                                    placeholder: 'Enter your nickname',
                                    maxlength: '20',
                                    autocomplete: 'off'
                                },
                                children: []
                            },
                            {
                                tag: 'button',
                                attributes: {
                                    id: 'join-game-btn',
                                    class: 'menu-btn'
                                },
                                children: ['Join Game']
                            }
                        ]
                    },
                    {
                        tag: 'a',
                        attributes: {
                            href: '/',
                            class: 'menu-btn',
                            style: 'margin-top: 2rem;'
                        },
                        children: ['Back to Menu']
                    }
                ]
            }
        ]
    });

    // Add event listener for the join button
    setTimeout(() => {
        const input = document.getElementById('nickname-input');
        const joinBtn = document.getElementById('join-game-btn');
        const networkManager = NetworkManager.getInstance();

        const handleJoin = () => {
            const nickname = input.value.trim();
            if (nickname) {
                sessionStorage.setItem('playerNickname', nickname);
                networkManager.joinGame(nickname);
                router.navigate('/lobby', true);
            } else {
                alert('Please enter a nickname');
                input.focus();
            }
        };

        joinBtn.addEventListener('click', handleJoin);
        input.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleJoin();
            }
        });

        input.focus();
    }, 0);

    return container;
}

// Lobby Page
function LobbyPage() {
    const container = dom({
        tag: 'div',
        attributes: {
            id: 'lobby-container',
            class: 'page-container'
        },
        children: [
            {
                tag: 'div',
                attributes: { class: 'lobby-box' },
                children: [
                    {
                        tag: 'h1',
                        attributes: {},
                        children: ['Game Lobby']
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
                        children: ['Leave Lobby']
                    }
                ]
            }
        ]
    });

    // Setup lobby functionality
    setTimeout(() => {
        const networkManager = NetworkManager.getInstance();
        const playerList = document.getElementById('player-list');
        const playerCount = document.getElementById('player-count');
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-chat-btn');
        const leaveBtn = document.getElementById('leave-lobby-btn');
        const countdownDisplay = document.getElementById('countdown-display');

        // Handle lobby joined
        networkManager.on('LOBBY_JOINED', (data) => {
            updatePlayerList(data.players);
            updatePlayerPosition(data.playerPosition, data.playerCount);
        });

        // Handle player joined
        networkManager.on('PLAYER_JOINED', (data) => {
            updatePlayerList(data.players);
            updatePlayerPosition(getCurrentPlayerPosition(data.players), data.players.length);
            addChatMessage('System', `${data.nickname} joined the lobby`);
        });

        // Handle player left
        networkManager.on('PLAYER_LEFT', (data) => {
            updatePlayerList(data.players);
            updatePlayerPosition(getCurrentPlayerPosition(data.players), data.players.length);
            addChatMessage('System', `${data.nickname} left the lobby`);
        });

        // Handle countdown
        networkManager.on('COUNTDOWN_START', (data) => {
            countdownDisplay.textContent = `Game starting in ${data.seconds} seconds...`;
            countdownDisplay.style.color = 'var(--timer-color)';
            countdownDisplay.style.fontSize = 'var(--font-size-lg)';
        });

        networkManager.on('COUNTDOWN_TICK', (data) => {
            countdownDisplay.textContent = `Game starting in ${data.remaining} seconds...`;
            if (data.remaining <= 3) {
                countdownDisplay.style.color = 'var(--accent-color)';
                countdownDisplay.style.animation = 'pulse 1s infinite';
            }
        });

        // Handle game start
        networkManager.on('GAME_STARTED', (data) => {
            router.navigate('/game-multi', true);
        });

        // Handle chat messages
        networkManager.on('CHAT_MESSAGE', (data) => {
            addChatMessage(data.nickname, data.text);
        });

        // Chat functionality
        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (message) {
                networkManager.sendChat(message);
                chatInput.value = '';
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });

        leaveBtn.addEventListener('click', () => {
            networkManager.quitGame();
            router.navigate('/', true);
        });

        function getCurrentPlayerPosition(players) {
            const currentPlayerId = networkManager.getPlayerId();
            return players.findIndex(p => p.playerId === currentPlayerId) + 1;
        }

        function updatePlayerPosition(position, totalPlayers) {
            const positionDisplay = document.getElementById('player-position') || createPlayerPositionDisplay();
            positionDisplay.textContent = `You are Player ${position}/${totalPlayers}`;
            positionDisplay.style.color = position <= 4 ? 'var(--timer-color)' : 'var(--accent-color)';
        }

        function createPlayerPositionDisplay() {
            const positionDisplay = dom({
                tag: 'div',
                attributes: {
                    id: 'player-position',
                    class: 'player-position'
                },
                children: []
            });
            
            const lobbyBox = document.querySelector('.lobby-box');
            const playerCount = document.getElementById('player-count');
            lobbyBox.insertBefore(positionDisplay, playerCount.nextSibling);
            
            return positionDisplay;
        }

        function updatePlayerList(players) {
            playerCount.textContent = `Players: ${players.length}/4`;
            
            // Update color based on player count
            if (players.length >= 2) {
                playerCount.style.color = 'var(--timer-color)';
            } else {
                playerCount.style.color = 'var(--accent-color)';
            }
            
            playerList.innerHTML = '';
            players.forEach((player, index) => {
                const playerEl = dom({
                    tag: 'div',
                    attributes: { 
                        class: 'player-item',
                        style: `animation-delay: ${index * 0.1}s;`
                    },
                    children: [
                        {
                            tag: 'span',
                            attributes: { class: 'player-number' },
                            children: [`P${index + 1}`]
                        },
                        {
                            tag: 'span',
                            attributes: { class: 'player-nickname' },
                            children: [player.nickname]
                        }
                    ]
                });
                playerList.appendChild(playerEl);
            });
            
            // Show status message
            if (players.length === 1) {
                addChatMessage('System', 'Waiting for more players to join...');
            } else if (players.length === 2) {
                addChatMessage('System', '20-second timer started. Game will begin when 4 players join or timer expires.');
            } else if (players.length === 4) {
                addChatMessage('System', 'Lobby full! Starting countdown...');
            }
        }

        function addChatMessage(nickname, text) {
            const messageEl = dom({
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
            chatMessages.appendChild(messageEl);
            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }, 0);

    return container;
}

// Multiplayer Game Page
async function MultiplayerGamePage() {
    const networkManager = NetworkManager.getInstance();
    
    // Initialize multiplayer game
    const game = Game.getInstance();
    game.isMultiplayer = true;
    game.networkManager = networkManager;
    window.game = game;

    // Setup multiplayer synchronization
    setupMultiplayerSync(game, networkManager);

    await game.intiElements();

    while (!game.player || !game.player.playerCoordinate) {
        await new Promise(r => setTimeout(r, 0));
    }

    // Create multiplayer UI elements
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
            }
        ]
    });
    document.body.appendChild(gameContainer);

    // Start the game
    await game.waitForLevel();
    game.run();

    // Setup in-game chat controls
    setupInGameChat(networkManager);

    return null;
}

// Setup in-game chat functionality
function setupInGameChat(networkManager) {
    const chatInput = document.getElementById('chat-input-game');
    const chatMessages = document.getElementById('chat-messages-game');
    let chatVisible = false;

    // Handle chat messages
    networkManager.on('CHAT_MESSAGE', (data) => {
        addGameChatMessage(data.nickname, data.text);
    });

    // Toggle chat with 'T' key
    document.addEventListener('keydown', (e) => {
        if (e.key.toLowerCase() === 't' && !chatVisible) {
            e.preventDefault();
            showChat();
        } else if (e.key === 'Escape' && chatVisible) {
            e.preventDefault();
            hideChat();
        } else if (e.key === 'Enter' && chatVisible) {
            e.preventDefault();
            sendGameMessage();
        }
    });

    function showChat() {
        chatVisible = true;
        chatInput.style.display = 'block';
        chatInput.focus();
        chatInput.placeholder = 'Type message and press Enter...';
    }

    function hideChat() {
        chatVisible = false;
        chatInput.style.display = 'none';
        chatInput.value = '';
        chatInput.blur();
    }

    function sendGameMessage() {
        const message = chatInput.value.trim();
        if (message) {
            networkManager.sendChat(message);
            chatInput.value = '';
        }
        hideChat();
    }

    function addGameChatMessage(nickname, text) {
        const messageEl = dom({
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
        
        chatMessages.appendChild(messageEl);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        
        // Auto-hide old messages
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.style.opacity = '0.5';
            }
        }, 5000);
        
        setTimeout(() => {
            if (messageEl.parentNode) {
                messageEl.remove();
            }
        }, 10000);
    }
}

// Router logic - render based on pathname
const appRoot = document.body;

// Track current page
let currentPage = null;

async function renderRoute() {
    const path = pathname();

    // Remove current page if exists
    if (currentPage && currentPage.parentNode === appRoot) {
        appRoot.removeChild(currentPage);
        currentPage = null;
    }

    // Render based on route
    if (path === '/' || path === '') {
        currentPage = MenuPage();
        appRoot.appendChild(currentPage);
    } else if (path === '/solo') {
        await SoloGamePage();
        // Solo game doesn't return a page element, it manages its own DOM
    } else if (path === '/multi') {
        currentPage = MultiplayerPage();
        appRoot.appendChild(currentPage);
    } else if (path === '/lobby') {
        currentPage = LobbyPage();
        appRoot.appendChild(currentPage);
    } else if (path === '/game-multi') {
        await MultiplayerGamePage();
    } else {
        // 404 - redirect to home
        router.navigate('/', true);
    }
}

// Watch for route changes
createEffect(() => {
    renderRoute();
});
