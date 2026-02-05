import { Router, dom, usePathname } from "../../framework/framework/index.js";
import { Game } from "../engine/core.js";
import { UI } from "../components/ui.js";
import { createEffect } from "../../framework/framework/state/signal.js";
import { NetworkManager } from '../network/networkManager.js';
import { getGameContainer, getLobbyContainer, getControlsContainer, showModal, getGameChatContainer, getEntryPageContainer } from "../utils/helpers.js";

export class OnlineApp {
    constructor() {
        this.router = Router.instance;
        this.router.initRouter();
        this.pathname = usePathname();
        this.currentPage = null;
        this.game = null;
        this.ui = null;
        this.eventListeners = [];
        this.networkManager = NetworkManager.getInstance();
        this.lobbyContainer = null;
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
            if (path !== '/lobby') {
                this.lobbyContainer = null;
            }
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
        const container = getEntryPageContainer();

        setTimeout(() => {
            const input = document.getElementById('nickname-input');
            const joinBtn = document.getElementById('join-btn');
            const errorMsg = document.getElementById('error-message');

            const validateNickname = (nickname) => {
                if (!nickname) {
                    return 'Nickname is required';
                }
                if (nickname.length < 3) {
                    return 'Nickname must be at least 3 characters';
                }
                if (nickname.length > 10) {
                    return 'Nickname must be at most 10 characters';
                }
                if (/\s/.test(nickname)) {
                    return 'Nickname cannot contain spaces';
                }
                if (!/^[a-zA-Z0-9_-]+$/.test(nickname)) {
                    return 'Nickname can only contain letters, numbers, _ and -';
                }
                return null;
            };

            const showError = (message) => {
                errorMsg.textContent = message;
                errorMsg.style.display = 'block';
            };

            const hideError = () => {
                errorMsg.style.display = 'none';
            };

            const handleJoin = () => {
                const nickname = input.value.trim();
                const error = validateNickname(nickname);
                
                if (error) {
                    showError(error);
                    input.focus();
                    return;
                }
                
                hideError();
                sessionStorage.setItem('playerNickname', nickname);
                this.networkManager.joinGame(nickname);
                this.router.navigate('/lobby', true);
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
        this.lobbyContainer = getLobbyContainer();
        this.setupLobby();
        return this.lobbyContainer;
    }

    setupLobby() {
        const chatInput = this.lobbyContainer.querySelector('#chat-input');
        const sendBtn = this.lobbyContainer.querySelector('#send-chat-btn');
        const leaveBtn = this.lobbyContainer.querySelector('#leave-lobby-btn');
        const countdownDisplay = this.lobbyContainer.querySelector('#countdown-display');

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

        const waitTimerStartedHandler = (data) => {
            countdownDisplay.textContent = `Waiting for players... ${data.remaining}s`;
            countdownDisplay.style.color = 'var(--timer-color)';
        };

        const waitTimerTickHandler = (data) => {
            countdownDisplay.textContent = `Waiting for players... ${data.remaining}s`;
        };

        const roomLockedHandler = (data) => {
            countdownDisplay.textContent = 'Room is locked!';
            countdownDisplay.style.color = 'var(--accent-color)';
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

        const gameOverHandler = (data) => {
            this.gameOverHandler(data.winner.nickname)
        }

        const errorHandler = (response) => {
            if (response.code === 'INVALID_NICKNAME') {
                this.router.navigate('/', true);
                setTimeout(() => {
                    const errorMsg = document.getElementById('error-message');
                    const input = document.getElementById('nickname-input');
                    if (errorMsg && input) {
                        errorMsg.textContent = response.message;
                        errorMsg.style.display = 'block';
                        input.focus();
                    }
                }, 100);
            } else {
                this.errorHandler(response);
            }
        }

        const lobbyDisbandedHandler = (data) => {
            window.location.href = '../index.html';
        };

        // Register network event handlers
        this.networkManager.on('LOBBY_JOINED', lobbyJoinedHandler);
        this.networkManager.on('PLAYER_JOINED', playerJoinedHandler);
        this.networkManager.on('PLAYER_LEFT', playerLeftHandler);
        this.networkManager.on('WAIT_TIMER_STARTED', waitTimerStartedHandler);
        this.networkManager.on('WAIT_TIMER_TICK', waitTimerTickHandler);
        this.networkManager.on('ROOM_LOCKED', roomLockedHandler);
        this.networkManager.on('COUNTDOWN_START', countdownStartHandler);
        this.networkManager.on('COUNTDOWN_TICK', countdownTickHandler);
        this.networkManager.on('LOBBY_DISBANDED', lobbyDisbandedHandler);
        this.networkManager.on('GAME_STARTED', gameStartedHandler);
        this.networkManager.on('CHAT_MESSAGE', chatMessageHandler);
        this.networkManager.on('GAME_OVER', gameOverHandler)
        this.networkManager.on('ERROR', errorHandler)

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
            showModal(
                'LEAVE LOBBY',
                'Are you sure you want to leave the lobby?',
                () => {
                    this.cleanup();
                    window.location.href = '../index.html';
                },
                () => {
                    // Do nothing, modal closed
                }
            );
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
        if (!this.lobbyContainer) return;
        const playerCount = this.lobbyContainer.querySelector('#player-count');
        const playerList = this.lobbyContainer.querySelector('#player-list');

        if (!playerCount || !playerList) return;

        playerCount.textContent = `Players: ${players.length}/4`;
        playerCount.style.color = players.length >= 2 ? 'var(--timer-color)' : 'var(--accent-color)';

        const playerElements = new Map(
            Array.from(playerList.children).map(el => [el.dataset.playerId, el])
        );

        const incomingPlayerIds = new Set(players.map(p => p.playerId));

        // Remove players who left
        for (const [playerId, element] of playerElements.entries()) {
            if (!incomingPlayerIds.has(playerId)) {
                element.remove();
            }
        }

        // Add/update/reorder players
        players.forEach((player, index) => {
            let playerEl = playerElements.get(player.playerId);

            if (!playerEl) {
                // Player is new, create element
                playerEl = dom({
                    tag: 'div',
                    attributes: { class: 'player-item', 'data-player-id': player.playerId },
                    children: [
                        { tag: 'span', attributes: { class: 'player-number' } },
                        { tag: 'span', attributes: { class: 'player-nickname' } },
                    ]
                });
            }

            // Update content
            playerEl.querySelector('.player-number').textContent = `P${index + 1}`;
            playerEl.querySelector('.player-nickname').textContent = player.nickname;
            playerEl.style.animationDelay = `${index * 0.1}s`;

            // Ensure correct order
            if (playerList.children[index] !== playerEl) {
                playerList.insertBefore(playerEl, playerList.children[index]);
            }
        });
    }

    addChatMessage(nickname, text) {
        if (!this.lobbyContainer) return;
        const chatMessages = this.lobbyContainer.querySelector('#chat-messages');
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

    errorHandler(data) {
        const errorScreen = dom({
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

        document.body.appendChild(errorScreen);
    }


    gameOverHandler(winnerName) {
        const myNickname = sessionStorage.getItem('playerNickname');
        const isWinner = winnerName === myNickname;
        
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

        document.body.appendChild(gameOverScreen);
    }

    async startMultiplayerGame() {
        document.body.innerHTML = '';

        const headerContainer = dom({
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
        headerContainer.appendChild(getControlsContainer());

        const gameContainer = getGameContainer();
        const chatContainer = getGameChatContainer();

        document.body.appendChild(headerContainer);
        document.body.appendChild(gameContainer);
        document.body.appendChild(chatContainer);


        this.game = Game.getInstance(this.gameData);
        await this.game.intiElements();

        this.ui = UI.getInstance(this.game);
        this.ui.renderPlayers(this.gameData.players);
        this.ui.initPingDisplay();

        await new Promise(r => setTimeout(r, 50));
        this.game.run();

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
                e.stopPropagation();
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
                chatInput.blur();
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

        // Clean up UI
        if (this.ui) {
            this.ui.destroyPingDisplay();
            UI.resetInstance();
            this.ui = null;
        }

        // Disconnect from network
        if (this.networkManager) {
            this.networkManager.quitGame();
        }

        // Clean up event listeners
        this.cleanupEventListeners();

        // Clear DOM
        document.body.innerHTML = '';

        // Clear game reference
        this.game = null;
    }
}

