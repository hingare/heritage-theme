// Heritage React islands. Built with `npm run build:js` into assets/react-islands.js.
// Liquid renders each island as <div data-react-island="name"> with its props in a
// <script type="application/json" data-island-props> child, plus plain HTML that shows
// until React takes over (and for shoppers without JavaScript).
import React from 'react';
import { createRoot } from 'react-dom/client';
import CollectionTabs from './CollectionTabs.jsx';
import GiftFinder from './GiftFinder.jsx';
import SearchPanel from './SearchPanel.jsx';

const components = { 'collection-tabs': CollectionTabs, 'gift-finder': GiftFinder, search: SearchPanel };
const roots = new WeakMap();

function mount(el) {
  if (roots.has(el)) return;
  const Component = components[el.dataset.reactIsland];
  const propsEl = el.querySelector(':scope > script[data-island-props]');
  if (!Component || !propsEl) return;
  let props;
  try { props = JSON.parse(propsEl.textContent); } catch (e) { return; }
  const root = createRoot(el);
  roots.set(el, root);
  root.render(<Component {...props} />);
  el.classList.add('is-hydrated');
}

function scan(ctx = document) {
  ctx.querySelectorAll('[data-react-island]').forEach(mount);
}

if (!window.HeritageIslands) {
  window.HeritageIslands = { scan };
  scan();
  document.addEventListener('shopify:section:load', (e) => scan(e.target));
  document.addEventListener('shopify:section:unload', (e) => {
    e.target.querySelectorAll('[data-react-island]').forEach((el) => {
      roots.get(el)?.unmount();
      roots.delete(el);
    });
  });
}
