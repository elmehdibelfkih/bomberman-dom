// import { Game } from "./engine/core.js"
import {OnlineApp} from "./app/onlineApp.js"

// const game = Game.getInstance();
// await game.intiElements();

// while (!game.player || !game.player.playerCoordinate) {
//     await new Promise(r => setTimeout(r, 0));
// }

// await game.waitForLevel();
// game.state.stopTimer();
// game.state.resetTimer();
// game.state.setTime(game.map.level.level_time);
// game.state.startTimer();
// game.run();
// // setTimeout(() => {
// //     game.state.pauseStart()
// //     levelDisplay.classList.remove('show');
// // }, 2000);


new OnlineApp();
