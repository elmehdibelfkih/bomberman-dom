import { createEffect } from '../state/signal.js';

export function Show(props) {
  const anchor = document.createTextNode('');
  let currentElements = [];

  queueMicrotask(() => {
    createEffect(() => {
      const condition = props.when();

      currentElements.forEach(el => el.remove());
      currentElements = [];

      let contentToRender = null;
      if (condition) {
        contentToRender = props.children;
      } else if (props.fallback) {
        contentToRender = props.fallback;
      }


      if (contentToRender && anchor.parentNode) {
        const elements = Array.isArray(contentToRender) ? contentToRender.flat() : [contentToRender];
        elements.forEach(el => {
          if (el) {
            anchor.parentNode.insertBefore(el, anchor);
          }
        });
        currentElements = elements.filter(Boolean);
      }
    });
  });

  return anchor;
}