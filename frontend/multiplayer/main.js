import { Router, dom, usePathname } from "../framework/index.js";
import { MultiplayerGameEngine } from "../game/engine/MultiplayerGameEngine.js";
import { createEffect } from "../framework/state/signal.js";
import { NetworkManager } from '../game/network/NetworkManager.js';
import { setupMultiplayerSync } from '../game/network/MultiplayerSync.js';
import { getGameContainer } from "../game/utils/helpers.js";
// import { NetworkStateSynchronizer } from '../game/network/NetworkStateSynchronizer.js';

class MultiplayerApp {
    constructor() {
        this.router = Router.instance;
        this.router.initRouter();
        this.pathname = usePathname();
        this.currentPage = null;
        this.game = null;
        this.eventListeners = [];
        this.networkManager = NetworkManager.getInstance();
        this.init();
    }

    init() {
        createEffect(() => {
            this.renderRoute();
        });
    }

    async renderRoute() {
        const path = this.pathname();

        if (this.currentPage && this.currentPage.parentNode === document.body) {
            document.body.removeChild(this.currentPage);
            this.currentPage = null;
        }

        if (path === '/' || path === '') {
            this.currentPage = this.createEntryPage();
            document.body.appendChild(this.currentPage);
        } else if (path === '/lobby') {
            this.currentPage = this.createLobbyPage();
            document.body.appendChild(this.currentPage);
        } else if (path === '/game') {
            await this.startMultiplayerGame();
        } else {
            this.router.navigate('/', true);
        }
    }

    createEntryPage() {
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
                                maxlength: '20',
                                autocomplete: 'off'
                            },
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

        setTimeout(() => {
            const input = document.getElementById('nickname-input');
            const joinBtn = document.getElementById('join-btn');

            const handleJoin = () => {
                const nickname = input.value.trim();
                if (nickname) {
                    sessionStorage.setItem('playerNickname', nickname);
                    this.networkManager.joinGame(nickname);
                    this.router.navigate('/lobby', true);
                } else {
                    alert('Please enter a nickname');
                    input.focus();
                }
            };

            const joinHandler = () => handleJoin();
            const keypressHandler = (e) => {
                if (e.key === 'Enter') handleJoin();
            };

            joinBtn.addEventListener('click', joinHandler);
            input.addEventListener('keypress', keypressHandler);

            this.eventListeners.push(
                { element: joinBtn, event: 'click', handler: joinHandler },
                { element: input, event: 'keypress', handler: keypressHandler }
            );

            input.focus();
        }, 0);

        return container;
    }

    createLobbyPage() {
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

        setTimeout(() => {
            this.setupLobby();
        }, 0);

        return container;
    }

    setupLobby() {
        const playerList = document.getElementById('player-list');
        const playerCount = document.getElementById('player-count');
        const chatMessages = document.getElementById('chat-messages');
        const chatInput = document.getElementById('chat-input');
        const sendBtn = document.getElementById('send-chat-btn');
        const leaveBtn = document.getElementById('leave-lobby-btn');
        const countdownDisplay = document.getElementById('countdown-display');

        // Network event handlers
        const lobbyJoinedHandler = (data) => {
            this.updatePlayerList(data.players);
        };

        const playerJoinedHandler = (data) => {
            this.updatePlayerList(data.players);
            this.addChatMessage('System', `${data.nickname} joined the lobby`);
        };

        const playerLeftHandler = (data) => {
            this.updatePlayerList(data.players);
            this.addChatMessage('System', `${data.nickname} left the lobby`);
        };

        const countdownStartHandler = (data) => {
            countdownDisplay.textContent = `Game starting in ${data.seconds} seconds...`;
            countdownDisplay.style.color = 'var(--timer-color)';
        };

        const countdownTickHandler = (data) => {
            countdownDisplay.textContent = `Game starting in ${data.remaining} seconds...`;
            if (data.remaining <= 3) {
                countdownDisplay.style.color = 'var(--accent-color)';
            }
        };

        const gameStartedHandler = (data) => {
            this.gameData = data;
            this.router.navigate('/game', true);
        };

        const chatMessageHandler = (data) => {
            this.addChatMessage(data.nickname, data.text);
        };

        // Register network event handlers
        this.networkManager.on('LOBBY_JOINED', lobbyJoinedHandler);
        this.networkManager.on('PLAYER_JOINED', playerJoinedHandler);
        this.networkManager.on('PLAYER_LEFT', playerLeftHandler);
        this.networkManager.on('COUNTDOWN_START', countdownStartHandler);
        this.networkManager.on('COUNTDOWN_TICK', countdownTickHandler);
        this.networkManager.on('GAME_STARTED', gameStartedHandler);
        this.networkManager.on('CHAT_MESSAGE', chatMessageHandler);

        // Chat functionality
        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (message) {
                this.networkManager.sendChat(message);
                chatInput.value = '';
            }
        };

        const sendClickHandler = () => sendMessage();
        const chatKeypressHandler = (e) => {
            if (e.key === 'Enter') sendMessage();
        };

        const leaveClickHandler = () => {
            this.cleanup();
            window.location.href = '../index.html';
        };

        sendBtn.addEventListener('click', sendClickHandler);
        chatInput.addEventListener('keypress', chatKeypressHandler);
        leaveBtn.addEventListener('click', leaveClickHandler);

        this.eventListeners.push(
            { element: sendBtn, event: 'click', handler: sendClickHandler },
            { element: chatInput, event: 'keypress', handler: chatKeypressHandler },
            { element: leaveBtn, event: 'click', handler: leaveClickHandler }
        );
    }

    updatePlayerList(players) {
        const playerCount = document.getElementById('player-count');
        const playerList = document.getElementById('player-list');

        if (!playerCount || !playerList) return;

        playerCount.textContent = `Players: ${players.length}/4`;

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
    }

    addChatMessage(nickname, text) {
        const chatMessages = document.getElementById('chat-messages');
        if (!chatMessages) return;

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

    async startMultiplayerGame() {
        document.body.innerHTML = '';

        // the multi player game engine
        // handle the game loop
        this.game = MultiplayerGameEngine.getInstance();
        this.game.setNetworkManager(this.networkManager);
        this.game.setRouter(this.router);
        await this.game.initGame(this.gameData);

        // UI place holders
        document.body.appendChild(getGameContainer());

        this.setupGameChat();
    }

    setupGameChat() {
        const chatInput = document.getElementById('chat-input-game');
        let chatVisible = false;

        const chatMessageHandler = (data) => {
            this.addGameChatMessage(data.nickname, data.text);
        };

        this.networkManager.on('CHAT_MESSAGE', chatMessageHandler);

        const keydownHandler = (e) => {
            if (e.key.toLowerCase() === 't' && !chatVisible) {
                e.preventDefault();
                chatVisible = true;
                chatInput.style.display = 'block';
                chatInput.focus();
                chatInput.placeholder = 'Type message and press Enter...';
            } else if (e.key === 'Escape' && chatVisible) {
                e.preventDefault();
                chatVisible = false;
                chatInput.style.display = 'none';
                chatInput.value = '';
                chatInput.blur();
            } else if (e.key === 'Enter' && chatVisible) {
                e.preventDefault();
                const message = chatInput.value.trim();
                if (message) {
                    this.networkManager.sendChat(message);
                    chatInput.value = '';
                }
                chatVisible = false;
                chatInput.style.display = 'none';
            }
        };

        document.addEventListener('keydown', keydownHandler);
        this.eventListeners.push({ element: document, event: 'keydown', handler: keydownHandler });
    }

    addGameChatMessage(nickname, text) {
        const chatMessages = document.getElementById('chat-messages-game');
        if (!chatMessages) return;

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

    cleanupEventListeners() {
        this.eventListeners.forEach(({ element, event, handler }) => {
            if (element && element.removeEventListener) {
                element.removeEventListener(event, handler);
            }
        });
        this.eventListeners = [];
    }

    cleanup() {
        // Stop game loop
        if (this.game) {
            this.game.stop();
        }

        // Disconnect from network
        if (this.networkManager) {
            this.networkManager.quitGame();
        }

        // Clean up event listeners
        this.cleanupEventListeners();

        // Clear DOM
        document.body.innerHTML = '';

        // Reset singleton instance
        MultiplayerGameEngine.resetInstance();

        // Clear game reference
        this.game = null;
        window.game = null;
    }
}

new MultiplayerApp();
