# Learning the Framework

This guide will walk you through the core concepts of the mini-framework.

## Core Concepts

The framework is built around a few core concepts:

-   **DOM Abstraction**: A way to create and manipulate DOM elements using JavaScript objects.
-   **State Management**: A reactive system using signals and effects to manage application state.
-   **Routing**: A simple routing system for building single-page applications.
-   **Event Handling**: A way to handle user interactions.

## DOM Abstraction

The `domAbstracting` function is the core of the DOM abstraction. It takes an object that describes a DOM element and returns a real DOM element.

**Example:**

```javascript
import * as fm from '../framwork/index.js';

const myElement = fm.domAbstracting({
  tag: 'div',
  attributes: { id: 'my-div', class: 'container' },
  children: ['Hello, World!']
});

document.body.append(myElement);
```

To make creating elements easier, you can use a helper function `h` (hyperscript-like):

```javascript
function h(tag, attributes, ...children) {
    return fm.domAbstracting({ tag, attributes, children: children.flat() });
}

const myElement = h('div', { id: 'my-div', class: 'container' },
  h('h1', {}, 'Hello'),
  h('p', {}, 'World')
);
```

## State Management

See the [State Management Documentation](./state.md) for a detailed explanation of `createSignal`, `createEffect`, and the `Show` component.

## Routing

The framework includes a simple router. See `router/router.js` for more details on how to use it.

## Event Handling

Events are handled by passing functions as attributes to elements.

**Example:**

```javascript
const myButton = h('button', {
  onclick: () => alert('Button clicked!')
}, 'Click me');
```