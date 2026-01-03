import { h, mount, state, effect, onCleanup, fragment } from './mini-dom.js';
import { Lobby } from './ui/lobby.js';
import { Game } from './ui/game.js';

const app = document.getElementById('app');

function App() {
  const [route, setRoute] = state('lobby');
  const [player, setPlayer] = state({ id: null, name: '', colorIndex: 0 });

  const startGame = (players, map) => {
    setRoute('game');
    // pass initial players list including self and the synchronized map
    mount(app, Game({ self: player(), players, map }));
  };

  return Lobby({ onReady: (self, players, map) => { setPlayer(self); startGame(players, map); } });
}

mount(app, App());
