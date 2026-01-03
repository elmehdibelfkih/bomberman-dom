// Minimal DOM micro-framework: reactive state, effect, h(), mount(), keyed children
// No VDOM diffing: we generate DOM and update through small binding functions for performance.

export function state(initial) {
  let value = initial;
  const subs = new Set();
  const getter = () => value;
  getter.subscribe = (fn) => { subs.add(fn); return () => subs.delete(fn); };
  const setter = (next) => { value = typeof next === 'function' ? next(value) : next; subs.forEach(fn => fn(value)); };
  return [getter, setter];
}

export function effect(fn) {
  const cleanup = fn();
  return () => { if (typeof cleanup === 'function') cleanup(); };
}

export function onCleanup(fn) { return fn; }

export function h(tag, props = {}, ...children) {
  if (typeof tag === 'function') return tag({ ...(props||{}), children });
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(props||{})) {
    if (k === 'style' && typeof v === 'object') Object.assign(el.style, v);
    else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'ref' && typeof v === 'function') v(el);
    else if (v != null) el.setAttribute(k, v);
  }
  const flat = children.flat();
  for (const c of flat) {
    if (c == null || c === false) continue;
    el.appendChild(typeof c === 'string' || typeof c === 'number' ? document.createTextNode(String(c)) : c);
  }
  return el;
}

export function mount(parent, node, replace = true) {
  if (replace) parent.replaceChildren(node);
  else parent.appendChild(node);
  return node;
}

export const fragment = (props) => props.children;

// FPS meter
export function createFpsMeter() {
  let last = performance.now();
  let frames = 0;
  let fps = 0;
  const listeners = new Set();
  function tick() {
    frames++;
    const now = performance.now();
    if (now - last >= 1000) {
      fps = frames;
      frames = 0;
      last = now;
      listeners.forEach(l => l(fps));
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
  return { subscribe: (fn) => { listeners.add(fn); return () => listeners.delete(fn); }, get: () => fps };
}
