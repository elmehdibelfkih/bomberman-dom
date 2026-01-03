import { h, state, mount } from '../mini-dom.js';
import { createSocket } from '../net/ws.js';

export function Lobby({ onReady }) {
  const [name, setName] = state('');
  const [players, setPlayers] = state([]);
  const [count, setCount] = state(0);
  const [status, setStatus] = state('disconnected');
  const [timer, setTimer] = state(null);
  const [phase, setPhase] = state('waiting');

  let socket = null;

  const submit = (e) => {
    e.preventDefault();
    if (!name().trim()) return;
    socket = createSocket(name().trim());
    socket.system((s) => setStatus(s.connected ? 'connected' : 'reconnecting'));
    socket.subscribe((msg) => {
      switch (msg.type) {
        case 'welcome':
          setPlayers(msg.players);
          setCount(msg.players.length);
          maybeStartCountdown();
          break;
        case 'join':
          setPlayers(p => [...p, msg.player]);
          setCount(c => c + 1);
          maybeStartCountdown();
          break;
        case 'leave':
          setPlayers(p => p.filter(pl => pl.id !== msg.id));
          setCount(c => Math.max(0, c - 1));
          break;
        case 'chat':
          appendChat(`${msg.from}: ${msg.text}`);
          break;
        case 'start':
          const selfPlayer = msg.players.find(p => p.id === msg.selfId) || { id: msg.selfId, name: name(), colorIndex: 0 };
          onReady(selfPlayer, msg.players, msg.map);
          break;
      }
    });
  };

  function maybeStartCountdown() {
    if (phase() !== 'waiting') return;
    if (count() >= 4) { startCountdown(10); return; }
    if (count() >= 2 && timer() == null) {
      startCountdown(10);
    }
  }

  function startCountdown(seconds) {
    setPhase('countdown');
    setTimer(seconds);
    const iv = setInterval(() => {
      setTimer(t => {
        const nt = t - 1;
        if (nt <= 0) {
          clearInterval(iv);
          socket?.send({ type: 'request-start' });
        }
        return nt;
      });
    }, 1000);
  }

  let chatLog;
  function appendChat(text) {
    const p = h('div', {}, text);
    chatLog.appendChild(p);
    chatLog.scrollTop = chatLog.scrollHeight;
  }

  const onSendChat = (e) => {
    e.preventDefault();
    const input = e.target.querySelector('input[name=chat]');
    const text = input.value.trim();
    if (!text) return;
    socket?.send({ type: 'chat', text });
    input.value = '';
  };

  const view = h('div', { class: 'ui-panel lobby' },
    h('h2', {}, 'Bomberman DOM — Lobby'),
    h('form', { onsubmit: submit, class: 'grid' },
      h('label', {}, 'Nickname'),
      h('input', { class: 'input', name: 'nick', placeholder: 'Your nickname', value: name(), oninput: (e) => setName(e.target.value) }),
      h('button', { class: 'btn', type: 'submit' }, 'Join lobby')
    ),
    h('div', { class: 'counter' }, `Players: ${count()} / 4 — ${status()}`),
    phase() === 'countdown' ? h('div', { class: 'timer' }, `Starting in ${timer()}s`) : null,
    h('div', { class: 'flex' },
      h('div', { class: 'chat ui-panel' },
        h('div', { class: 'chat-log', ref: (el) => chatLog = el }),
        h('form', { class: 'chat-input', onsubmit: onSendChat },
          h('input', { class: 'input', name: 'chat', placeholder: 'Say hi…' }),
          h('button', { class: 'btn', type: 'submit' }, 'Send')
        )
      )
    )
  );

  return view;
}
