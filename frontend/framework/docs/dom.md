# Reactive DOM Framework



## Installation

```bash
# Clone or download the framework files
# Import modules directly in your project
```

## Quick Start

```javascript

import * as fm from "../../framwork/index.js";
const { dom, createSignal } = fm;

const [count, setCount] = createSignal(0);

const app = dom({
  tag: 'div',
  attributes: { class: 'container' },
  children: [
    dom({
      tag: 'h1',
      children: [() => `Count: ${count()}`]
    }),
    dom({
      tag: 'button',
      attributes: {
        onclick: () => setCount(count() + 1)
      },
      children: ['Increment']
    })
  ]
});

document.body.appendChild(app);
```

## Core API

### DOM Creation

Create DOM elements using the `dom()` function:

```javascript
const element = dom({
  tag: 'div',
  attributes: { 
    class: 'my-class',
    id: 'my-id'
  },
  children: ['Hello World']
});
```

### Reactivity

Make your UI reactive with signals:

```javascript
import { createSignal } from './state/signal.js';

const [name, setName] = createSignal('John');

const greeting = dom({
  tag: 'p',
  children: [
    () => `Hello, ${name()}!`  // Reactive text node
  ]
});

// Update the UI
setName('Jane');  // UI updates automatically
```

### Reactive Attributes

Attributes can also be reactive:

```javascript
const [isActive, setIsActive] = createSignal(false);

const button = dom({
  tag: 'button',
  attributes: {
    class: () => isActive() ? 'active' : 'inactive',
    disabled: () => !isActive()
  },
  children: ['Toggle']
});
```

### Event Handlers

Add event listeners with the `on` prefix:

```javascript
const input = dom({
  tag: 'input',
  attributes: {
    type: 'text',
    oninput: (e) => console.log(e.target.value),
    onchange: (e) => handleChange(e),
    onfocus: () => console.log('focused')
  }
});
```

### Conditional Rendering

Use the `Show` component for conditional content:

```javascript
import { Show } from './dom/show.js';

const [isVisible, setIsVisible] = createSignal(true);

const content = Show({
  when: isVisible,
  children: dom({
    tag: 'p',
    children: ['This is visible']
  }),
  fallback: dom({
    tag: 'p',
    children: ['This is hidden']
  })
});

document.body.appendChild(content);
```

## Complete Example

```javascript
import { dom } from './dom/dom.js';
import { Show } from './dom/show.js';
import { createSignal } from './state/signal.js';

// State
const [todos, setTodos] = createSignal([]);
const [input, setInput] = createSignal('');

// Add todo function
const addTodo = () => {
  if (input().trim()) {
    setTodos([...todos(), { id: Date.now(), text: input() }]);
    setInput('');
  }
};

// App component
const app = dom({
  tag: 'div',
  attributes: { class: 'todo-app' },
  children: [
    dom({
      tag: 'h1',
      children: ['Todo List']
    }),
    dom({
      tag: 'input',
      attributes: {
        type: 'text',
        placeholder: 'Add a todo...',
        value: () => input(),
        oninput: (e) => setInput(e.target.value),
        onkeypress: (e) => e.key === 'Enter' && addTodo()
      }
    }),
    dom({
      tag: 'button',
      attributes: { onclick: addTodo },
      children: ['Add']
    }),
    Show({
      when: () => todos().length > 0,
      children: dom({
        tag: 'ul',
        children: todos().map(todo => 
          dom({
            tag: 'li',
            children: [todo.text]
          })
        )
      }),
      fallback: dom({
        tag: 'p',
        children: ['No todos yet!']
      })
    })
  ]
});

document.body.appendChild(app);
```

## API Reference

### `dom(node)`

Creates a DOM element from a node object.

**Parameters:**
- `node` (Object|String): Node configuration or text string
  - `tag` (String): HTML tag name
  - `attributes` (Object): Element attributes
  - `children` (Array): Child nodes

**Returns:** DOM Element

### `Show(props)`

Conditional rendering component.

**Parameters:**
- `props.when` (Function): Condition function returning boolean
- `props.children` (Node): Content to show when true
- `props.fallback` (Node): Content to show when false (optional)

**Returns:** Text node anchor

### `createSignal(initialValue)`

Creates a reactive signal (defined in signal.js).

**Parameters:**
- `initialValue` (Any): Initial value

**Returns:** `[getter, setter]`

## Validation

Enable development mode validation:

```javascript
// In dom.js, set:
const devMode = true;
```

This validates HTML tags and attributes against standards.

## Supported HTML

All standard HTML5 elements and attributes are supported, including:
- Global attributes (id, class, style, title, etc.)
- ARIA attributes
- Event handlers (onclick, oninput, etc.)
- Tag-specific attributes

## Browser Support

Modern browsers with ES6+ support:
- Chrome/Edge 60+
- Firefox 60+
- Safari 12+

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit issues or pull requests.

---

**Happy coding!** 