# Event Module
# Event System Documentation

The framework includes an Event Emitter for custom application events - a message bus where components can communicate without tight coupling.

## Getting Started

```javascript
import { eventEmitter } from './event/event_emitter.js';
```

The `eventEmitter` is a singleton instance shared across your app.

---

## Core Methods

### on(event, listener)

Register a function that runs every time an event happens.

```javascript
eventEmitter.on('userLogin', (user) => {
  console.log(`${user.name} logged in`);
});
```

### once(event, listener)

Register a function that runs only once, then automatically removes itself.

```javascript
eventEmitter.once('appReady', () => {
  console.log('App initialized');
});
```

### off(event, listener)

Remove a specific listener, or all listeners for an event.

```javascript
// Remove specific listener
eventEmitter.off('buttonClick', handleClick);

// Remove all listeners for event
eventEmitter.off('buttonClick');
```

### emit(event, ...args)

Trigger an event and call all its listeners.

```javascript
eventEmitter.emit('userLogin', { name: 'Alice', id: 123 });
eventEmitter.emit('dataUpdated', oldData, newData);
```

### hasListener(event, listener)

Check if a listener exists.

```javascript
if (eventEmitter.hasListener('userLogin')) {
  console.log('Someone is listening');
}
```

### hasOnceListener(event, listener)

Check if a once listener exists.

```javascript
if (eventEmitter.hasOnceListener('init', handleInit)) {
  console.log('Init handler is ready');
}
```

### removeAllListeners(event?)

Remove all listeners for an event, or all events.

```javascript
eventEmitter.removeAllListeners('userLogout');  // Specific event
eventEmitter.removeAllListeners();              // Everything
```

### listeners(event)

Get all listeners for an event.

```javascript
const loginListeners = eventEmitter.listeners('userLogin');
console.log(`${loginListeners.size} listeners`);
```

### onceListeners(event)

Get all one-time listeners for an event.

```javascript
const handlers = eventEmitter.onceListeners('appReady');
```

### listenerCount(event)

Count regular listeners for an event.

```javascript
const count = eventEmitter.listenerCount('dataUpdate');
```

### onceListenerCount(event)

Count once listeners for an event.

```javascript
const count = eventEmitter.onceListenerCount('firstLoad');
```

### eventNames()

Get all event names that have listeners.

```javascript
const events = eventEmitter.eventNames();
console.log('Active events:', events);
```

### setMaxListeners(n)

Change the maximum listeners allowed per event (default: 10).

```javascript
eventEmitter.setMaxListeners(50);
```

### getMaxListeners()

Get the current maximum listener limit.

```javascript
const max = eventEmitter.getMaxListeners();
```

### onStrictMode() / offStrictMode()

Control error handling. Strict mode throws errors from listeners, normal mode catches them silently.

```javascript
eventEmitter.onStrictMode();   // Errors throw
eventEmitter.offStrictMode();  // Errors caught (default)
```

---

## Example Usage

```javascript
import { eventEmitter } from './event/event_emitter.js';

// Register listeners
eventEmitter.on('taskComplete', (task) => {
  console.log(`Task completed: ${task.name}`);
  updateUI(task);
});

eventEmitter.once('firstTask', () => {
  showTutorial();
});

// Trigger events
function completeTask(task) {
  task.completed = true;
  eventEmitter.emit('taskComplete', task);
}

// Cleanup
eventEmitter.off('taskComplete', updateUI);
```

## Use Cases

**Component Communication**
```javascript
eventEmitter.emit('cartUpdated', { items: 5 });
eventEmitter.on('cartUpdated', (cart) => updateBadge(cart.items));
```

**Authentication**
```javascript
eventEmitter.on('userLogin', (user) => {
  loadUserData(user);
  redirectToDashboard();
});
```

**App Lifecycle**
```javascript
eventEmitter.once('appReady', () => {
  initializePlugins();
  loadSavedState();
});
```

---

## Best Practices

Do:
- Use descriptive event names
- Clean up listeners when done
- Use `once()` for initialization
- Keep listener functions focused

Don't:
- Create circular event chains
- Emit events in tight loops
- Forget to remove listeners
- Overuse for simple parent-child communication

---

## Global Event Manager

A DOM event delegation system (in development).

```javascript
import { eventManager } from './event/event.js';
```- [lean the framework](./README.md)