// Simple WebSocket wrapper with auto-retry. For local demo uses public echo if no WS_URL.
const WS_URL = (location.protocol === 'https:' ? 'wss://' : 'ws://') + (location.hostname || 'localhost') + ':8080';

export function createSocket(nickname) {
  let ws;
  let connected = false;
  const listeners = new Set();
  const systemListeners = new Set();

  function connect() {
    try {
      ws = new WebSocket(WS_URL);
      ws.onopen = () => {
        connected = true;
        systemListeners.forEach(l => l({ type: 'status', connected }));
        ws.send(JSON.stringify({ type: 'hello', nickname }));
      };
      ws.onmessage = (ev) => {
        try { const msg = JSON.parse(ev.data); listeners.forEach(l => l(msg)); } catch {}
      };
      ws.onclose = () => {
        if (connected) systemListeners.forEach(l => l({ type: 'status', connected: false }));
        connected = false;
        // retry
        setTimeout(connect, 1000);
      };
      ws.onerror = () => { try { ws.close(); } catch {} };
    } catch (e) { setTimeout(connect, 1000); }
  }
  connect();

  return {
    send: (obj) => { if (connected && ws?.readyState === WebSocket.OPEN) ws.send(JSON.stringify(obj)); },
    subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); },
    system: (fn) => { systemListeners.add(fn); return () => systemListeners.delete(fn); }
  };
}
