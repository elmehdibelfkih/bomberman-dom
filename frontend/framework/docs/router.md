# Reactive Router

**Ultra-simple reactive URL state management. No views, no rendering - just reactive signals.**

## Philosophy

This router does ONE thing: **manage URL state reactively**.

- **No views** - Your components handle their own rendering
- **No routing logic** - Use reactive signals to show/hide components
- **No middleware** - Handle logic in your components
- **Just reactive URL state** - pathname, search params, hash as signals

## What It Does

The router exposes three reactive signals:

- `pathname` - Current URL pathname
- `searchParams` - URLSearchParams object
- `hash` - URL hash fragment

When the URL changes (link click, back/forward, programmatic navigation), these signals automatically update and trigger effects.

## API

### Initialize

```javascript
import { Router } from './framework/router/router.js'

Router.instance.initRouter();
```

### Navigate

```javascript
Router.instance.navigate('/about');
Router.instance.navigate('/login', true); // Replace history
```

### Reactive Hooks

```javascript
import { usePathname, useSearchParams, useHash, useSearchParam, useNavigate } from './framework/index.js'

const pathname = usePathname();           // Get pathname reactively
const searchParams = useSearchParams();   // Get search params reactively
const hash = useHash();                   // Get hash reactively
const userId = useSearchParam('userId');  // Get specific param reactively
const navigate = useNavigate();           // Get navigate function
```

## Usage Examples

### Example 1: Hash-Based Filtering (TodoMVC)

```javascript
import { createMemo, useHash } from './framework/index.js'

// Initialize router
Router.instance.initRouter();

// Get reactive hash
const hash = useHash();

// Derive filter from hash
const filter = createMemo(() => {
    const currentHash = hash();
    if (currentHash === '#/active') return 'active';
    if (currentHash === '#/completed') return 'completed';
    return 'all';
});

// Filter todos based on current filter
const filteredTodos = createMemo(() => {
    const currentFilter = filter();
    return todos().filter(todo => {
        if (currentFilter === 'active') return !todo.completed;
        if (currentFilter === 'completed') return todo.completed;
        return true;
    });
});

// Create filter links
const filters = dom({
    tag: "ul",
    children: [
        {
            tag: "li",
            children: [{
                tag: "a",
                attributes: {
                    href: "#/",
                    class: () => filter() === 'all' ? 'selected' : ''
                },
                children: ["All"]
            }]
        },
        {
            tag: "li",
            children: [{
                tag: "a",
                attributes: {
                    href: "#/active",
                    class: () => filter() === 'active' ? 'selected' : ''
                },
                children: ["Active"]
            }]
        }
    ]
});
```

### Example 2: Reactive Navigation Menu

```javascript
import { dom, usePathname, createEffect } from './framework/index.js'

const pathname = usePathname();

const nav = dom({
    tag: "nav",
    children: [
        {
            tag: "a",
            attributes: {
                href: "/",
                class: () => pathname() === '/' ? 'active' : ''
            },
            children: ["Home"]
        },
        {
            tag: "a",
            attributes: {
                href: "/about",
                class: () => pathname() === '/about' ? 'active' : ''
            },
            children: ["About"]
        }
    ]
});

// Show different content based on pathname
const content = dom({ tag: "div", children: [] });

createEffect(() => {
    const path = pathname();

    if (path === '/') {
        content.innerHTML = '<h1>Home Page</h1>';
    } else if (path === '/about') {
        content.innerHTML = '<h1>About Page</h1>';
    } else {
        content.innerHTML = '<h1>404 Not Found</h1>';
    }
});
```

### Example 3: Query Parameters

```javascript
import { useSearchParam, createEffect } from './framework/index.js'

const page = useSearchParam('page');
const search = useSearchParam('search');

createEffect(() => {
    const currentPage = page() || '1';
    const searchTerm = search() || '';

    console.log(`Page ${currentPage}, searching for: ${searchTerm}`);

    // Fetch data, update UI, etc.
});
```

### Example 4: Programmatic Navigation

```javascript
import { useNavigate } from './framework/index.js'

const navigate = useNavigate();

// Navigate to a new page
button.onclick = () => navigate('/dashboard');

// Replace current entry (e.g., after login)
loginButton.onclick = () => {
    // Do login...
    navigate('/dashboard', true); // Replace, don't add to history
};
```

### Example 5: Conditional Rendering

```javascript
import { dom, usePathname } from './framework/index.js'

const pathname = usePathname();

const app = dom({
    tag: "div",
    children: [
        // Show admin panel only on /admin route
        {
            tag: "div",
            attributes: {
                style: () => pathname() === '/admin' ? '' : 'display: none;'
            },
            children: [/* Admin UI */]
        },
        // Show user panel on other routes
        {
            tag: "div",
            attributes: {
                style: () => pathname() !== '/admin' ? '' : 'display: none;'
            },
            children: [/* User UI */]
        }
    ]
});
```

## How It Works

### Link Click Interception

The router intercepts clicks on `<a>` tags:

```javascript
// This navigates without full page reload
<a href="/about">About</a>
```

Links are **NOT** intercepted if:

- Hash-only change (e.g., `#/active` → lets browser handle it)
- External link (different origin)
- `target="_blank"` or download attribute
- User holds Cmd/Ctrl/Shift/Alt

### Hash Changes

Hash changes are handled natively by the browser and tracked via `hashchange` event:

```javascript
// These just change the hash, browser handles navigation
<a href="#/active">Active</a>
<a href="#/completed">Completed</a>

// Router updates the hash signal
window.addEventListener('hashchange', () => {
    this.#setHash(window.location.hash);
});
```

### Reactive Updates

```
URL changes
  ↓
Router updates signals
  ↓
Effects re-run
  ↓
UI updates automatically
```

## What This Router Does NOT Have

- ❌ Views/Components - Handle rendering yourself
- ❌ Route matching (`:id`) - Use search params instead
- ❌ Nested routes - Keep it simple
- ❌ Route guards - Handle in your components
- ❌ Lazy loading - Load what you need when you need it

## Why So Simple?

**The reactive system is powerful enough to handle routing logic.**

```javascript
// Instead of route params like /users/:id
// Use search params: /users?id=123
const userId = useSearchParam('id');

// Instead of route guards
createEffect(() => {
    if (pathname() === '/admin' && !isAuthenticated()) {
        navigate('/login', true);
    }
});

// Instead of nested routes
// Just render child components conditionally
const content = dom({
    tag: "div",
    children: () => {
        if (pathname() === '/users') {
            return [/* User list */];
        } else if (pathname().startsWith('/users/')) {
            return [/* User detail */];
        }
        return [];
    }
});
```

## Benefits

1. **Automatic UI Updates** - Change URL, UI updates automatically
2. **No Boilerplate** - No route configs, just reactive signals
3. **Flexible** - Build any routing pattern you want
4. **Small** - ~145 lines of code
5. **Fast** - Fine-grained updates, no re-rendering

## Complete Example

```javascript
import { Router, dom, createEffect, usePathname, useHash, useNavigate } from './framework/index.js'

// Initialize router
Router.instance.initRouter();

// Get reactive state
const pathname = usePathname();
const hash = useHash();
const navigate = useNavigate();

// Create navigation
const nav = dom({
    tag: "nav",
    children: [
        {
            tag: "a",
            attributes: {
                href: "/",
                class: () => pathname() === '/' ? 'active' : ''
            },
            children: ["Home"]
        },
        {
            tag: "a",
            attributes: {
                href: "/about",
                class: () => pathname() === '/about' ? 'active' : ''
            },
            children: ["About"]
        }
    ]
});

// Create content that reacts to route
const content = dom({ tag: "div", children: [] });

createEffect(() => {
    const path = pathname();

    if (path === '/') {
        content.innerHTML = '<h1>Home</h1>';
    } else if (path === '/about') {
        content.innerHTML = '<h1>About</h1>';
    } else {
        content.innerHTML = '<h1>404</h1>';
    }
});

// Add to page
document.body.append(nav, content);
```

That's it! Simple, reactive, powerful.
