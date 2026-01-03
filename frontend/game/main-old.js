import { Router, dom, usePathname } from "../framwork/index.js"
import { createEffect } from "../framwork/state/signal.js"
import { SoloMode, MultiplayerEntryPage, MultiplayerLobby, MultiplayerGame } from "./modes/index.js"

// Initialize the router
const router = Router.instance
router.initRouter()

// Get pathname signal
const pathname = usePathname()

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
    const soloMode = SoloMode.getInstance()
    return await soloMode.initializePage()
}

// Multiplayer Entry Page
function MultiplayerPage() {
    return MultiplayerEntryPage(router)
}

// Lobby Page
function LobbyPage() {
    return MultiplayerLobby(router)
}

// Multiplayer Game Page
async function MultiplayerGamePage() {
    const multiplayerGame = MultiplayerGame.getInstance()
    return await multiplayerGame.initializePage()
}

// Router logic - render based on pathname
const appRoot = document.body;

// Track current page
let currentPage = null

async function renderRoute() {
    const path = pathname()

    // Remove current page if exists
    if (currentPage && currentPage.parentNode === appRoot) {
        appRoot.removeChild(currentPage)
        currentPage = null
    }

    // Render based on route
    if (path === '/' || path === '') {
        currentPage = MenuPage()
        appRoot.appendChild(currentPage)
    } else if (path === '/solo') {
        await SoloGamePage()
    } else if (path === '/multi') {
        currentPage = MultiplayerPage()
        appRoot.appendChild(currentPage)
    } else if (path === '/lobby') {
        currentPage = LobbyPage()
        appRoot.appendChild(currentPage)
    } else if (path === '/game-multi') {
        await MultiplayerGamePage()
    } else {
        router.navigate('/', true)
    }
}

// Watch for route changes
createEffect(() => {
    renderRoute()
})
