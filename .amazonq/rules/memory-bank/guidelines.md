# Development Guidelines

## Code Quality Standards

### Formatting and Structure
- **ES6+ Module System**: Use `import`/`export` statements for all module dependencies
- **Consistent Indentation**: 4-space indentation throughout the codebase
- **Semicolon Usage**: Optional semicolons - used inconsistently but prefer omission for cleaner code
- **String Literals**: Prefer single quotes for strings, template literals for interpolation
- **Object/Array Formatting**: Multi-line objects with trailing commas for better diffs

### Naming Conventions
- **Classes**: PascalCase (e.g., `AuthoritativeGameState`, `NetworkManager`, `MultiplayerUI`)
- **Functions/Methods**: camelCase (e.g., `validatePlayerMove`, `broadcastGameState`, `handleJoin`)
- **Variables**: camelCase (e.g., `playerId`, `gameRoom`, `networkManager`)
- **Constants**: UPPER_SNAKE_CASE (e.g., `GAME_CONFIG`, `BOMB_TIMER`)
- **DOM IDs**: kebab-case (e.g., `'game-status-indicator'`, `'player-list'`)
- **CSS Classes**: kebab-case (e.g., `'menu-btn'`, `'player-item'`)

### File Organization
- **Single Responsibility**: Each file contains one primary class or related functionality
- **Descriptive Names**: File names clearly indicate their purpose (e.g., `AuthoritativeGameState.js`, `MultiplayerUI.js`)
- **Directory Structure**: Logical grouping by functionality (`core/`, `network/`, `components/`, `utils/`)

## Architectural Patterns

### Singleton Pattern Implementation
```javascript
// Consistent singleton pattern across the codebase
static #Instance = null
static getInstance() {
    if (!RoomManager.#Instance) {
        RoomManager.#Instance = new RoomManager()
    }
    return RoomManager.#Instance
}

constructor() {
    if (RoomManager.#Instance) {
        throw new Error('Use RoomManager.getInstance()')
    }
    // initialization code
}
```

### DOM Creation Pattern
```javascript
// MANDATORY: Use custom framework for ALL DOM creation
const element = dom({
    tag: 'div',
    attributes: {
        id: 'element-id',
        class: 'element-class',
        'aria-label': 'Accessibility label'
    },
    children: [
        {
            tag: 'span',
            attributes: { class: 'child-class' },
            children: ['Text content']
        }
    ]
});

// NEVER use innerHTML or createElement - always use dom() function
// NEVER use document.createElement() - use framework instead
```

### Event Handling Pattern
```javascript
// Deferred event binding using setTimeout
setTimeout(() => {
    const element = document.getElementById('element-id');
    element.addEventListener('click', handleClick);
}, 0);
```

### Network Message Handling
```javascript
// Consistent message broadcasting pattern
this.gameRoom.broadcast(
    MessageBuilder.messageType(param1, param2, param3)
);

// Event-driven network handling
networkManager.on('MESSAGE_TYPE', (data) => {
    // Handle message
});
```

## Common Implementation Patterns

### Validation and Error Handling
- **Server-side Validation**: Always validate player actions on the authoritative server
- **Graceful Degradation**: Handle missing elements and network failures gracefully
- **Logging**: Use Logger utility for consistent error reporting and debugging

### State Management
- **Authoritative Server**: Server maintains canonical game state
- **Client Prediction**: Clients predict actions for responsiveness
- **State Synchronization**: Regular state broadcasts to maintain consistency

### Async/Await Usage
```javascript
// Consistent async patterns for initialization
async function initializeGame() {
    await game.intiElements();
    
    while (!game.player || !game.player.playerCoordinate) {
        await new Promise(r => setTimeout(r, 0));
    }
    
    await game.waitForLevel();
}
```

### Map and Set Usage
- **Player Management**: Use `Map` for player collections with ID keys
- **Entity Storage**: Use `Map` for bombs, powerups, and other game entities
- **Attribute Validation**: Use `Set` for efficient attribute checking

## Internal API Patterns

### Game Entity Management
```javascript
// Consistent entity storage and retrieval
this.gameEngine.entities.players.set(playerId, player);
this.gameEngine.entities.bombs.set(bombId, bomb);
this.gameEngine.entities.powerups.set(powerUpId, powerUp);

// Entity iteration
for (const [id, entity] of this.gameEngine.entities.players.entries()) {
    // Process entity
}
```

### Timer Management
```javascript
// Consistent timer patterns
this.stateTimer = setInterval(() => {
    this.broadcastGameState();
}, this.stateUpdateInterval);

// Cleanup timers
if (this.stateTimer) {
    clearInterval(this.stateTimer);
    this.stateTimer = null;
}
```

### DOM Manipulation
```javascript
// MANDATORY: Create elements with dom() framework first
const element = dom({
    tag: 'div',
    attributes: { id: 'element-id' },
    children: ['Content']
});

// Then append to document.body for game elements
document.body.appendChild(element);

// Use getElementById for element retrieval (framework doesn't replace this)
const element = document.getElementById('element-id');

// Clean up DOM elements
element.remove();
```

## Framework Usage Requirements

### Mandatory DOM Framework Usage
- **ALL DOM Creation**: Use `dom()` function from framework for every element
- **NO innerHTML**: Never use innerHTML, innerText manipulation for creation
- **NO createElement**: Never use document.createElement() directly
- **Consistent Structure**: All elements must follow framework's tag/attributes/children pattern
- **Framework Import**: Always import `{ dom }` from framework in frontend files

### Framework Pattern Examples
```javascript
// Correct: Using framework
const button = dom({
    tag: 'button',
    attributes: { 
        id: 'my-button',
        class: 'btn',
        onclick: handleClick 
    },
    children: ['Click Me']
});

// Wrong: Direct DOM manipulation
const button = document.createElement('button'); // NEVER DO THIS
button.innerHTML = 'Click Me'; // NEVER DO THIS
```

## Code Quality Practices

### Accessibility Standards
- **ARIA Labels**: Include `aria-label` attributes for interactive elements
- **Semantic HTML**: Use appropriate HTML tags (`button`, `input`, `nav`)
- **Keyboard Navigation**: Support Enter key for form submissions

### Performance Considerations
- **Efficient Loops**: Use `for...of` and `forEach` appropriately
- **Memory Management**: Clean up timers, event listeners, and DOM elements
- **Batch Operations**: Group DOM manipulations and network messages

### Security Practices
- **Input Validation**: Validate all user inputs (nicknames, chat messages)
- **HTML Attribute Validation**: Use comprehensive attribute validation system
- **Safe DOM Creation**: MANDATORY use of dom() framework instead of innerHTML
- **Framework Compliance**: Never bypass the custom DOM framework for element creation

### Testing and Debugging
- **Console Logging**: Use Logger utility for structured logging
- **Error Boundaries**: Wrap async operations in try-catch blocks
- **Development Helpers**: Expose game instance to window for debugging