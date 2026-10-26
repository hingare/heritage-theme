/* Heritage theme — extra features: wishlist, recently viewed, countdowns, hotspots,
   before/after, scroll effects, lazy product lists, popup, delivery estimate. No dependencies. */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const parseHTML = (text) => new DOMParser().parseFromString(text, 'text/html');
  const root = () => (window.theme && window.theme.routes.root) || '/';
  const reveal = (el) => window.Heritage && window.Heritage.initReveal(el);

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
    }
  };

  // Product tiles are rendered by sections/product-card-ajax.liquid on each product URL.
  const cardCache = new Map();
  function fetchCard(handle) {
    if (!cardCache.has(handle)) {
      const url = `${root().replace(/\/$/, '')}/products/${encodeURIComponent(handle)}?section_id=product-card-ajax`;
      cardCache.set(handle, fetch(url)
        .then((res) => (res.ok ? res.text() : ''))
        .then((html) => (html ? parseHTML(html).querySelector('.product-card') : null))
        .catch(() => null));
    }
    return cardCache.get(handle).then((card) => (card ? card.cloneNode(true) : null));
  }

  async function renderCards(grid, handles) {
    const cards = await Promise.all(handles.map(fetchCard));
    grid.innerHTML = '';
    cards.filter(Boolean).forEach((card) => grid.appendChild(card));
    syncWishlistButtons(grid);
    reveal(grid);
    return grid.children.length;
  }

  /* ------------------------------------------------------------------ */
  /* Wishlist                                                            */
  /* ------------------------------------------------------------------ */
  const WISHLIST_KEY = 'heritage-wishlist';
  const wishlist = () => store.get(WISHLIST_KEY, []);

  function syncWishlistButtons(ctx = document) {
    const list = wishlist();
    $$('[data-wishlist-toggle]', ctx).forEach((btn) => {
      const on = list.includes(btn.dataset.wishlistToggle);
      btn.classList.toggle('is-active', on);
      btn.setAttribute('aria-pressed', on);
      const label = on ? btn.dataset.labelRemove : btn.dataset.labelAdd;
      const text = btn.querySelector('[data-wishlist-label]');
      if (text) text.textContent = label;
      else if (label) btn.setAttribute('aria-label', label);
    });
    $$('[data-wishlist-count]').forEach((el) => {
      el.textContent = list.length > 0 ? list.length : '';
      el.dataset.count = list.length;
    });
  }

  function initWishlist() {
    if (!window.theme?.settings.wishlist) return;
    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-wishlist-toggle]');
      if (!btn) return;
      e.preventDefault();
      const handle = btn.dataset.wishlistToggle;
      let list = wishlist();
      list = list.includes(handle) ? list.filter((h) => h !== handle) : [handle, ...list].slice(0, 50);
      store.set(WISHLIST_KEY, list);
      btn.classList.add('is-bumping');
      setTimeout(() => btn.classList.remove('is-bumping'), 350);
      syncWishlistButtons();
      const page = $('[data-wishlist-page]');
      if (page && !list.includes(handle)) btn.closest('.product-card')?.remove();
      if (page) toggleWishlistEmpty(page, list.length);
    });
    syncWishlistButtons();
    renderWishlistPage();
  }

  function toggleWishlistEmpty(page, count) {
    const empty = $('[data-wishlist-empty]', page);
    if (empty) empty.hidden = count > 0;
  }

  async function renderWishlistPage() {
    const page = $('[data-wishlist-page]');
    if (!page) return;
    const grid = $('[data-wishlist-grid]', page);
    const handles = wishlist();
    if (!handles.length) { toggleWishlistEmpty(page, 0); return; }
    grid.classList.add('is-loading');
    const count = await renderCards(grid, handles);
    grid.classList.remove('is-loading');
    toggleWishlistEmpty(page, count);
  }

  /* ------------------------------------------------------------------ */
  /* Recently viewed (handles are saved by layout/theme.liquid)          */
  /* ------------------------------------------------------------------ */
  async function initRecentlyViewed(ctx = document) {
    for (const section of $$('[data-recently-viewed]', ctx)) {
      const limit = parseInt(section.dataset.limit || '4', 10);
      const handles = store.get('heritage-recently-viewed', [])
        .filter((h) => h !== section.dataset.exclude)
        .slice(0, limit);
      if (!handles.length) continue;
      const count = await renderCards($('[data-recently-viewed-grid]', section), handles);
      section.classList.toggle('tw-hidden', count === 0);
    }
  }

  /* ------------------------------------------------------------------ */
  /* Lazy compact product lists (complementary block, cart upsell)       */
  /* ------------------------------------------------------------------ */
  function initLazyProducts(ctx = document) {
    $$('[data-lazy-products]', ctx).forEach(async (el) => {
      if (el.dataset.ready) return;
      el.dataset.ready = '1';
      try {
        const res = await fetch(el.dataset.lazyProducts);
        const list = parseHTML(await res.text()).querySelector('[data-compact-products]');
        if (!list) return;
        const exclude = (el.dataset.exclude || '').split(',');
        let items = $$('[data-compact-product]', list).filter((item) => !exclude.includes(item.dataset.compactProduct));
        if (el.dataset.limit) items = items.slice(0, parseInt(el.dataset.limit, 10));
        if (!items.length) return;
        const target = $('[data-lazy-products-target]', el);
        items.forEach((item) => target.appendChild(item));
        el.classList.remove('tw-hidden');
      } catch (e) { /* stay hidden */ }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Countdown timers                                                    */
  /* ------------------------------------------------------------------ */
  function initCountdowns(ctx = document) {
    $$('[data-countdown]', ctx).forEach((el) => {
      if (el.dataset.ready) return;
      el.dataset.ready = '1';
      const end = new Date(el.dataset.countdown).getTime();
      if (Number.isNaN(end)) return;
      const pad = (n) => String(n).padStart(2, '0');
      const parts = ['days', 'hours', 'minutes', 'seconds'].map((k) => $(`[data-countdown-${k}]`, el));
      const tick = () => {
        const diff = Math.max(0, end - Date.now());
        const s = Math.floor(diff / 1000);
        [Math.floor(s / 86400), Math.floor(s / 3600) % 24, Math.floor(s / 60) % 60, s % 60]
          .forEach((v, i) => { if (parts[i]) parts[i].textContent = pad(v); });
        if (diff === 0) {
          clearInterval(timer);
          if (el.dataset.countdownHide === 'true' && !window.Shopify?.designMode) {
            (el.closest('.shopify-section') && el.matches('.countdown-banner') ? el.closest('.shopify-section') : el).hidden = true;
          } else {
            $('[data-countdown-timer]', el)?.classList.add('tw-hidden');
            $('[data-countdown-done]', el)?.classList.remove('tw-hidden');
          }
        }
      };
      const timer = setInterval(tick, 1000);
      tick();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Estimated delivery date                                             */
  /* ------------------------------------------------------------------ */
  function initDelivery(ctx = document) {
    $$('[data-delivery-estimate]', ctx).forEach((el) => {
      const skipWeekends = el.dataset.skipWeekends === 'true';
      const start = new Date();
      if (start.getHours() >= parseInt(el.dataset.cutoff || '24', 10)) start.setDate(start.getDate() + 1);
      const addDays = (days) => {
        const d = new Date(start);
        let left = days;
        while (left > 0) {
          d.setDate(d.getDate() + 1);
          if (!skipWeekends || (d.getDay() !== 0 && d.getDay() !== 6)) left -= 1;
        }
        return d;
      };
      const fmt = new Intl.DateTimeFormat(document.documentElement.lang || undefined, { weekday: 'short', month: 'short', day: 'numeric' });
      const min = parseInt(el.dataset.min || '0', 10);
      const max = Math.max(min, parseInt(el.dataset.max || '0', 10));
      const target = $('[data-delivery-range]', el);
      if (target) target.textContent = min === max ? fmt.format(addDays(max)) : `${fmt.format(addDays(min))} – ${fmt.format(addDays(max))}`;
    });
  }

  /* ------------------------------------------------------------------ */
  /* Shop the look hotspots                                              */
  /* ------------------------------------------------------------------ */
  function initHotspots(ctx = document) {
    $$('[data-hotspots]', ctx).forEach((wrap) => {
      if (wrap.dataset.ready) return;
      wrap.dataset.ready = '1';
      const activate = (index) => {
        $$('[data-hotspot]', wrap).forEach((h) => h.classList.toggle('is-active', h.dataset.hotspot === index));
        $$('[data-hotspot-card]', wrap).forEach((c) => c.classList.toggle('is-active', c.dataset.hotspotCard === index));
      };
      wrap.addEventListener('click', (e) => {
        const spot = e.target.closest('[data-hotspot]');
        if (!spot) return;
        activate(spot.dataset.hotspot);
        const card = $(`[data-hotspot-card="${spot.dataset.hotspot}"]`, wrap);
        if (card && window.innerWidth < 990) card.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      });
      wrap.addEventListener('mouseover', (e) => {
        const item = e.target.closest('[data-hotspot], [data-hotspot-card]');
        if (item) activate(item.dataset.hotspot || item.dataset.hotspotCard);
      });
    });
  }

  /* ------------------------------------------------------------------ */
  /* Before / after slider                                               */
  /* ------------------------------------------------------------------ */
  function initBeforeAfter(ctx = document) {
    $$('[data-before-after]', ctx).forEach((el) => {
      const range = $('[data-before-after-range]', el);
      if (!range || range.dataset.ready) return;
      range.dataset.ready = '1';
      range.addEventListener('input', () => el.style.setProperty('--position', `${range.value}%`));
    });
  }

  /* ------------------------------------------------------------------ */
  /* Image banner scroll effects                                         */
  /* ------------------------------------------------------------------ */
  const banners = new Set();
  let ticking = false;
  function updateBanners() {
    ticking = false;
    const vh = window.innerHeight;
    banners.forEach((el) => {
      const rect = el.getBoundingClientRect();
      if (rect.bottom < 0 || rect.top > vh) return;
      const progress = Math.min(1, Math.max(0, (vh - rect.top) / (vh + rect.height)));
      el.style.setProperty('--scroll', progress.toFixed(3));
    });
  }
  function initBanners(ctx = document) {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    $$('[data-image-banner]', ctx).forEach((el) => banners.add(el));
    banners.forEach((el) => { if (!el.isConnected) banners.delete(el); });
    updateBanners();
  }
  window.addEventListener('scroll', () => {
    if (!ticking && banners.size) { ticking = true; requestAnimationFrame(updateBanners); }
  }, { passive: true });

  /* ------------------------------------------------------------------ */
  /* Newsletter popup                                                    */
  /* ------------------------------------------------------------------ */
  function initPopup(ctx = document) {
    const popup = $('[data-popup]', ctx);
    if (!popup || popup.dataset.ready) return;
    popup.dataset.ready = '1';
    const KEY = 'heritage-popup';
    const state = store.get(KEY, {});
    const open = () => window.Heritage?.openPanel(popup);
    // Back from a submit: show the success or error message inside the popup.
    // Every newsletter form on the page shows the result, so only reopen when this one was used.
    if (popup.querySelector('.form-message')) {
      if (popup.querySelector('.form-message:not(.form-message--error)')) store.set(KEY, { subscribed: true });
      if (window.location.hash.includes('NewsletterPopup')) open();
      return;
    }
    if (popup.dataset.designMode === 'true' || state.subscribed) return;
    const days = parseInt(popup.dataset.frequency || '14', 10);
    if (state.seen && Date.now() - state.seen < days * 864e5) return;
    setTimeout(() => {
      if (document.body.classList.contains('is-locked')) return; // another drawer is open
      open();
      store.set(KEY, { seen: Date.now() });
    }, parseInt(popup.dataset.delay || '8', 10) * 1000);
  }

  /* ------------------------------------------------------------------ */
  /* Back to top                                                         */
  /* ------------------------------------------------------------------ */
  function initBackToTop() {
    const btn = $('[data-back-to-top]');
    if (!btn) return;
    const onScroll = () => btn.classList.toggle('is-visible', window.scrollY > window.innerHeight * 1.5);
    window.addEventListener('scroll', onScroll, { passive: true });
    btn.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
    onScroll();
  }

  /* ------------------------------------------------------------------ */
  /* React islands (assets/react-islands.js, built from src/react)       */
  /* Loaded only when a page has an island: as it nears the viewport, or */
  /* for the header search, the first time the shopper reaches for it.  */
  /* ------------------------------------------------------------------ */
  let islandsRequested = false;
  function loadIslands() {
    if (window.HeritageIslands) { window.HeritageIslands.scan(); return; }
    if (islandsRequested || !window.theme?.assets?.reactIslands) return;
    islandsRequested = true;
    const script = document.createElement('script');
    script.src = window.theme.assets.reactIslands;
    script.defer = true;
    document.head.appendChild(script);
  }

  let islandObserver;
  function initIslands(ctx = document) {
    const islands = $$('[data-react-island]:not([data-island-lazy])', ctx);
    if (!islands.length) return;
    if (!('IntersectionObserver' in window)) { loadIslands(); return; }
    islandObserver = islandObserver || new IntersectionObserver((entries) => {
      if (entries.some((e) => e.isIntersecting)) { islandObserver.disconnect(); loadIslands(); }
    }, { rootMargin: '600px 0px' });
    islands.forEach((el) => islandObserver.observe(el));
  }

  function initLazySearch() {
    if (!$('#SearchModal [data-react-island]')) return;
    const warm = (e) => { if (e.target.closest && e.target.closest('[data-open="SearchModal"]')) loadIslands(); };
    ['pointerover', 'focusin', 'touchstart', 'click'].forEach((type) => document.addEventListener(type, warm, { passive: true }));
  }

  /* ------------------------------------------------------------------ */
  /* Boot + theme editor hooks                                           */
  /* ------------------------------------------------------------------ */
  function initSection(ctx = document) {
    initRecentlyViewed(ctx);
    initLazyProducts(ctx);
    initCountdowns(ctx);
    initDelivery(ctx);
    initHotspots(ctx);
    initBeforeAfter(ctx);
    initBanners(ctx);
    initIslands(ctx);
    syncWishlistButtons(ctx);
  }

  function init() {
    initWishlist();
    initSection();
    initPopup();
    initBackToTop();
    initLazySearch();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  // React islands render product tiles after load; update their wishlist hearts and reveal them.
  document.addEventListener('heritage:cards:rendered', (e) => {
    const el = e.detail && e.detail.el;
    syncWishlistButtons(el || document);
    if (el) reveal(el);
  });

  // The cart drawer is replaced after every cart change; load its upsell again.
  document.addEventListener('heritage:cart:rendered', () => initLazyProducts($('#CartDrawer') || document));

  document.addEventListener('shopify:section:load', (e) => {
    initSection(e.target);
    if ($('[data-popup]', e.target)) initPopup(e.target);
  });
  document.addEventListener('shopify:section:select', (e) => {
    const popup = $('[data-popup]', e.target);
    if (popup) window.Heritage?.openPanel(popup);
  });
  document.addEventListener('shopify:section:deselect', (e) => {
    const popup = $('[data-popup]', e.target);
    if (popup) window.Heritage?.closePanel(popup);
  });
})();
