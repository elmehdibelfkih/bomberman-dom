import { Game } from "./engine/core.js"

window.game = Game.getInstance();
await game.intiElements();

while (!game.player || !game.player.playerCoordinate) {
    await new Promise(r => setTimeout(r, 0));
}

window.startGame = async function () {
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
}