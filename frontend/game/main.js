import { Game } from "./engine/core.js"
import { eventManager } from "../framwork/index.js"

const game = Game.getInstance();
window.game = game;
await game.intiElements();

while (!game.player || !game.player.playerCoordinate) {
    await new Promise(r => setTimeout(r, 0));
}

// Use event manager for start button
const startBtn = document.getElementById('start-btn');
eventManager.addEventListener(startBtn, 'click', async () => {
    await game.waitForLevel();
    document.getElementById('instructions').classList.add('hidden');
    const levelDisplay = document.getElementById('level-display');
    levelDisplay.textContent = `${game.map.level.name}`
    levelDisplay.classList.add('show')
    game.state.stopTimer();
    game.state.resetTimer();
    game.state.setTime(game.map.level.level_time);
    game.state.startTimer();
    game.run();
    setTimeout(() => {
        game.state.pauseStart()
        levelDisplay.classList.remove('show');
    }, 2000);
});

// Use event manager for multiplayer button
const multiplayerBtn = document.getElementById('multiplayer-btn');
eventManager.addEventListener(multiplayerBtn, 'click', () => {
    document.getElementById('instructions').classList.add('hidden');
    game.multiplayer.showLobbyUI();
});