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

        const handleJoin = () => {
            const nickname = input.value.trim();
            if (nickname) {
                // Store nickname for multiplayer game
                sessionStorage.setItem('playerNickname', nickname);
                // TODO: Connect to multiplayer game server
                console.log('Joining multiplayer game as:', nickname);
                alert(`Welcome, ${nickname}! Multiplayer game will start soon.`);
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
    } else {
        // 404 - redirect to home
        router.navigate('/', true);
    }
}

// Watch for route changes
createEffect(() => {
    renderRoute();
});
