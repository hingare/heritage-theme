/* Heritage theme — storefront behaviour. No dependencies. */
(function () {
  'use strict';

  const $ = (sel, ctx = document) => ctx.querySelector(sel);
  const $$ = (sel, ctx = document) => Array.from(ctx.querySelectorAll(sel));
  const parseHTML = (text) => new DOMParser().parseFromString(text, 'text/html');
  const debounce = (fn, wait = 300) => {
    let t;
    return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), wait); };
  };

  /* ------------------------------------------------------------------ */
  /* Drawers, modals and overlay                                         */
  /* ------------------------------------------------------------------ */
  const overlay = () => $('[data-overlay]');
  let activePanel = null;
  let lastFocus = null;

  function openPanel(panel) {
    if (!panel) return;
    if (activePanel && activePanel !== panel) closePanel(activePanel, false);
    lastFocus = document.activeElement;
    activePanel = panel;
    panel.classList.add('is-open');
    panel.setAttribute('aria-hidden', 'false');
    // The sticky header is its own stacking context, so lift it above the overlay while its drawer is open.
    panel.closest('.shopify-section')?.classList.add('has-open-panel');
    if (!panel.classList.contains('modal')) overlay()?.classList.add('is-visible');
    document.body.classList.add('is-locked');
    const focusable = panel.querySelector('input:not([type=hidden]), button, a[href]');
    setTimeout(() => focusable && focusable.focus(), 50);
  }

  function closePanel(panel = activePanel, restoreFocus = true) {
    if (!panel) return;
    panel.classList.remove('is-open');
    panel.setAttribute('aria-hidden', 'true');
    panel.closest('.shopify-section')?.classList.remove('has-open-panel');
    overlay()?.classList.remove('is-visible');
    document.body.classList.remove('is-locked');
    activePanel = null;
    if (restoreFocus && lastFocus) lastFocus.focus();
  }

  document.addEventListener('click', (e) => {
    const opener = e.target.closest('[data-open]');
    if (opener) {
      e.preventDefault();
      openPanel(document.getElementById(opener.dataset.open));
      return;
    }
    if (e.target.closest('[data-close]') || e.target.matches('[data-overlay]') || e.target.matches('.modal__backdrop')) {
      e.preventDefault();
      closePanel();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const lb = $('.lightbox.is-open');
      if (lb) { lb.classList.remove('is-open'); document.body.classList.remove('is-locked'); return; }
      closePanel();
    }
  });

  /* ------------------------------------------------------------------ */
  /* Header                                                              */
  /* ------------------------------------------------------------------ */
  function initHeader() {
    const wrapper = $('[data-header-wrapper]');
    if (wrapper && (wrapper.classList.contains('is-sticky') || wrapper.classList.contains('site-header-wrapper--transparent'))) {
      const onScroll = () => wrapper.classList.toggle('is-scrolled', window.scrollY > 10);
      window.addEventListener('scroll', onScroll, { passive: true });
      onScroll();
    }
    // The transparent header overlaps the first section by its own height.
    if (wrapper && 'ResizeObserver' in window) {
      new ResizeObserver(() => document.documentElement.style.setProperty('--header-height', `${wrapper.offsetHeight}px`)).observe(wrapper);
    }
    document.addEventListener('click', (e) => {
      const toggle = e.target.closest('[data-mobile-toggle]');
      if (!toggle) return;
      const sub = document.getElementById(toggle.getAttribute('aria-controls'));
      const open = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!open));
      sub?.classList.toggle('is-open', !open);
    });
  }

  /* Announcement bar rotation */
  function initAnnouncements(root = document) {
    $$('[data-announcement-slider]', root).forEach((slider) => {
      if (slider.dataset.ready) return;
      slider.dataset.ready = '1';
      const items = $$('.announcement-bar__message', slider);
      if (items.length < 2) return;
      let i = 0;
      const speed = parseInt(slider.dataset.speed || '5', 10) * 1000;
      setInterval(() => {
        items[i].classList.remove('is-active');
        i = (i + 1) % items.length;
        items[i].classList.add('is-active');
      }, speed);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Predictive search                                                   */
  /* ------------------------------------------------------------------ */
  function initSearch() {
    const input = $('[data-predictive-input]');
    const results = $('[data-predictive-results]');
    if (!input || !results) return;
    let controller;
    const run = debounce(async () => {
      const q = input.value.trim();
      if (!q) { results.innerHTML = ''; return; }
      controller?.abort();
      controller = new AbortController();
      try {
        const url = `${window.theme.routes.predictiveSearch}?q=${encodeURIComponent(q)}&resources[type]=product,collection,page,article&resources[limit]=6&section_id=predictive-search`;
        const res = await fetch(url, { signal: controller.signal });
        const doc = parseHTML(await res.text());
        const content = doc.querySelector('[data-predictive-content]');
        results.innerHTML = content ? content.innerHTML : '';
      } catch (err) {
        if (err.name !== 'AbortError') results.innerHTML = '';
      }
    }, 250);
    input.addEventListener('input', run);
  }

  /* ------------------------------------------------------------------ */
  /* Cart                                                                */
  /* ------------------------------------------------------------------ */
  const Cart = {
    sections() {
      const ids = ['cart-drawer'];
      if ($('[data-cart-page]')) ids.push($('[data-cart-page]').dataset.sectionId);
      return ids;
    },

    async request(url, body) {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...body, sections: this.sections(), sections_url: window.location.pathname })
      });
      const data = await res.json();
      if (!res.ok || data.status) throw data;
      return data;
    },

    render(sections) {
      if (!sections) return;
      Object.entries(sections).forEach(([id, html]) => {
        if (!html) return;
        const doc = parseHTML(html);
        if (id === 'cart-drawer') {
          const fresh = doc.querySelector('[data-cart-drawer-inner]');
          const current = $('[data-cart-drawer-inner]');
          if (fresh && current) current.replaceWith(fresh);
        } else {
          const fresh = doc.querySelector('[data-cart-page]');
          const current = $('[data-cart-page]');
          if (fresh && current) current.replaceWith(fresh);
        }
      });
      document.dispatchEvent(new CustomEvent('heritage:cart:rendered'));
    },

    updateCount(count) {
      $$('[data-cart-count]').forEach((el) => {
        el.textContent = count > 0 ? count : '';
        el.dataset.count = count;
      });
    },

    async refreshCount() {
      const res = await fetch(`${window.theme.routes.cart}.js`);
      const cart = await res.json();
      this.updateCount(cart.item_count);
    },

    async add(formData, button) {
      button?.classList.add('is-loading');
      const errorEl = button?.closest('form')?.querySelector('[data-form-error]');
      if (errorEl) errorEl.textContent = '';
      try {
        const body = { items: [{ id: Number(formData.get('id')), quantity: Number(formData.get('quantity') || 1) }] };
        const props = {};
        for (const [k, v] of formData.entries()) {
          const m = k.match(/^properties\[(.+)\]$/);
          if (m && v) props[m[1]] = v;
        }
        if (Object.keys(props).length) body.items[0].properties = props;
        if (formData.get('selling_plan')) body.items[0].selling_plan = formData.get('selling_plan');
        const data = await this.request(`${window.theme.routes.cartAdd}.js`, body);
        if (window.theme.settings.cartType === 'page') {
          window.location.href = window.theme.routes.cart;
          return;
        }
        this.render(data.sections);
        await this.refreshCount();
        closePanel(activePanel, false);
        openPanel($('#CartDrawer'));
      } catch (err) {
        const message = err.description || err.message || 'Error';
        if (errorEl) errorEl.textContent = message;
        else window.alert(message);
      } finally {
        button?.classList.remove('is-loading');
      }
    },

    async change(line, quantity) {
      const container = $('.cart-drawer.is-open') || $('[data-cart-page]');
      container?.classList.add('is-loading');
      try {
        const data = await this.request(`${window.theme.routes.cartChange}.js`, { line, quantity });
        this.render(data.sections);
        this.updateCount(data.item_count);
      } catch (err) {
        window.alert(err.description || err.message || 'Error');
      } finally {
        container?.classList.remove('is-loading');
        $('[data-cart-page]')?.classList.remove('is-loading');
      }
    }
  };
  window.HeritageCart = Cart;
  window.Heritage = { openPanel, closePanel, initReveal: (root) => initReveal(root) };

  const qtyTimers = {};
  function initCart() {
    document.addEventListener('submit', (e) => {
      const form = e.target.closest('form[data-product-form]');
      if (!form || window.theme.settings.cartType === 'page' && !form.dataset.ajax) return;
      e.preventDefault();
      Cart.add(new FormData(form), form.querySelector('[type=submit]'));
    });

    document.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-qty-btn]');
      if (btn) {
        const input = btn.parentElement.querySelector('input');
        const step = btn.dataset.qtyBtn === 'plus' ? 1 : -1;
        const min = parseInt(input.min || '0', 10);
        input.value = Math.max(min, (parseInt(input.value, 10) || 0) + step);
        input.dispatchEvent(new Event('change', { bubbles: true }));
        return;
      }
      const remove = e.target.closest('[data-cart-remove]');
      if (remove) {
        e.preventDefault();
        Cart.change(Number(remove.dataset.cartRemove), 0);
      }
      const checkout = e.target.closest('[name="checkout"]');
      if (checkout) {
        const terms = checkout.form?.querySelector('[data-cart-terms]');
        if (terms && !terms.checked) {
          e.preventDefault();
          window.alert(terms.dataset.message);
        }
      }
    });

    document.addEventListener('change', (e) => {
      const input = e.target.closest('[data-cart-line-qty]');
      if (input) {
        // Wait for fast +/- clicks to settle so only the final quantity is sent.
        const line = input.dataset.cartLineQty;
        clearTimeout(qtyTimers[line]);
        qtyTimers[line] = setTimeout(() => Cart.change(Number(line), Number(input.value)), 350);
      }
      const note = e.target.closest('[data-cart-note]');
      if (note) {
        fetch(`${window.theme.routes.cart}/update.js`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ note: note.value })
        });
      }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Product: variants, gallery, sticky add to cart                      */
  /* ------------------------------------------------------------------ */
  function initProduct(root) {
    if (!root || root.dataset.ready) return;
    root.dataset.ready = '1';
    const json = root.querySelector('[data-product-json]');
    if (!json) return;
    const product = JSON.parse(json.textContent);
    const form = root.querySelector('form[data-product-form]');
    const idInput = form?.querySelector('input[name="id"]');
    const picker = root.querySelector('[data-variant-picker]');

    initGallery(root);

    const selectedOptions = () => {
      if (!picker) return null;
      return $$('[data-option-index]', picker).map((group) => {
        const select = group.querySelector('select');
        if (select) return select.value;
        const checked = group.querySelector('input:checked');
        return checked ? checked.value : null;
      });
    };

    const updateAvailability = (options) => {
      $$('[data-option-index]', picker).forEach((group) => {
        const index = Number(group.dataset.optionIndex);
        $$('input', group).forEach((input) => {
          const possible = product.variants.some((v) =>
            v.available && v.options[index] === input.value &&
            v.options.every((val, i) => i === index || i > index || val === options[i])
          );
          input.classList.toggle('is-unavailable', !possible);
        });
        const label = group.querySelector('[data-selected-value]');
        if (label) label.textContent = options[index];
      });
    };

    const onChange = async () => {
      const options = selectedOptions();
      const variant = product.variants.find((v) => v.options.every((val, i) => val === options[i]));
      updateAvailability(options);
      const button = form?.querySelector('[type=submit]');
      if (!variant) {
        if (button) { button.disabled = true; button.textContent = window.theme.strings.unavailable; }
        return;
      }
      if (idInput) idInput.value = variant.id;
      if (variant.featured_media) scrollGalleryTo(root, variant.featured_media.id);
      if (root.dataset.updateUrl === 'true') {
        const url = new URL(window.location.href);
        url.searchParams.set('variant', variant.id);
        window.history.replaceState({}, '', url.toString());
      }
      try {
        const res = await fetch(`${root.dataset.url}?variant=${variant.id}&section_id=${root.dataset.sectionId}`);
        const doc = parseHTML(await res.text());
        $$('[data-update]', root).forEach((el) => {
          const fresh = doc.querySelector(`[data-update="${el.dataset.update}"]`);
          if (fresh) el.innerHTML = fresh.innerHTML;
        });
        const freshBtn = doc.querySelector('form[data-product-form] [type=submit]');
        if (button && freshBtn) {
          button.disabled = freshBtn.disabled;
          button.innerHTML = freshBtn.innerHTML;
        }
        const stickyBtn = $('[data-sticky-atc-button]');
        if (stickyBtn && freshBtn && root.dataset.updateUrl === 'true') stickyBtn.disabled = freshBtn.disabled;
        $$('[data-sticky-atc-update]').forEach((el) => {
          const fresh = doc.querySelector(`[data-sticky-atc-update="${el.dataset.stickyAtcUpdate}"]`);
          if (fresh) el.innerHTML = fresh.innerHTML;
        });
      } catch (err) { /* keep current markup */ }
    };

    picker?.addEventListener('change', onChange);
    if (picker) updateAvailability(selectedOptions());

    // Sticky add to cart
    const sticky = $('[data-sticky-atc]');
    const mainButton = form?.querySelector('[type=submit]');
    if (sticky && mainButton && root.dataset.updateUrl === 'true') {
      const io = new IntersectionObserver(([entry]) => {
        const past = !entry.isIntersecting && entry.boundingClientRect.top < 0;
        sticky.classList.toggle('is-visible', past);
      });
      io.observe(mainButton);
      sticky.querySelector('[data-sticky-atc-button]')?.addEventListener('click', (e) => {
        e.preventDefault();
        if (picker && product.variants.length > 1 && !idInput.value) {
          root.scrollIntoView({ behavior: 'smooth' });
          return;
        }
        form.requestSubmit ? form.requestSubmit(mainButton) : mainButton.click();
      });
    }
  }

  function initGallery(root) {
    const gallery = root.querySelector('[data-gallery]');
    if (!gallery) return;
    const track = gallery.querySelector('[data-gallery-track]');
    const slides = $$('[data-media-id]', track);
    const thumbs = $$('[data-thumb]', gallery);

    const setActive = (index) => {
      thumbs.forEach((t, i) => t.classList.toggle('is-active', i === index));
      thumbs[index]?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    };
    const goTo = (index) => {
      const slide = slides[index];
      if (!slide) return;
      if (gallery.classList.contains('product-gallery--stacked') && window.innerWidth >= 990) {
        slide.scrollIntoView({ behavior: 'smooth', block: 'center' });
      } else {
        track.scrollTo({ left: slide.offsetLeft - track.offsetLeft, behavior: 'smooth' });
      }
      setActive(index);
    };
    gallery._goTo = (id) => {
      const idx = slides.findIndex((s) => s.dataset.mediaId === String(id));
      if (idx > -1) goTo(idx);
    };
    thumbs.forEach((t, i) => t.addEventListener('click', () => goTo(i)));
    gallery.querySelector('[data-gallery-prev]')?.addEventListener('click', () => {
      const i = thumbs.findIndex((t) => t.classList.contains('is-active'));
      goTo(Math.max(0, i - 1));
    });
    gallery.querySelector('[data-gallery-next]')?.addEventListener('click', () => {
      const i = thumbs.findIndex((t) => t.classList.contains('is-active'));
      goTo(Math.min(slides.length - 1, i + 1));
    });
    track.addEventListener('scroll', debounce(() => {
      if (track.scrollWidth <= track.clientWidth) return;
      const index = Math.round(track.scrollLeft / track.clientWidth);
      setActive(index);
    }, 80), { passive: true });

    // Lightbox zoom
    const lightbox = $('[data-lightbox]', root) || $('[data-lightbox]');
    if (gallery.dataset.zoom === 'true' && lightbox) {
      slides.forEach((slide) => {
        const img = slide.querySelector('img[data-zoom-src]');
        if (!img) return;
        slide.addEventListener('click', () => {
          const body = lightbox.querySelector('[data-lightbox-body]');
          body.innerHTML = slides
            .map((s) => s.querySelector('img[data-zoom-src]'))
            .filter(Boolean)
            .map((i) => `<img src="${i.dataset.zoomSrc}" alt="${i.alt || ''}" loading="lazy">`)
            .join('');
          lightbox.classList.add('is-open');
          document.body.classList.add('is-locked');
          const target = body.querySelectorAll('img')[slides.indexOf(slide)];
          target?.scrollIntoView();
        });
      });
      lightbox.querySelector('[data-lightbox-close]')?.addEventListener('click', () => {
        lightbox.classList.remove('is-open');
        document.body.classList.remove('is-locked');
      });
    }
  }

  function scrollGalleryTo(root, mediaId) {
    const gallery = root.querySelector('[data-gallery]');
    gallery?._goTo?.(mediaId);
  }

  /* ------------------------------------------------------------------ */
  /* Quick view and quick add                                            */
  /* ------------------------------------------------------------------ */
  function initQuickView() {
    const modal = $('#QuickViewModal');
    if (!modal) return;
    const body = modal.querySelector('[data-quick-view-body]');

    document.addEventListener('click', async (e) => {
      const trigger = e.target.closest('[data-quick-view]');
      if (!trigger) return;
      e.preventDefault();
      body.innerHTML = '<div class="modal__loading"></div>';
      openPanel(modal);
      try {
        const res = await fetch(`${trigger.dataset.quickView}${trigger.dataset.quickView.includes('?') ? '&' : '?'}section_id=quick-view`);
        const doc = parseHTML(await res.text());
        const content = doc.querySelector('[data-quick-view-content]');
        body.innerHTML = content ? content.innerHTML : '';
        const root = body.querySelector('[data-product-root]');
        initProduct(root);
        if (window.Shopify && window.Shopify.PaymentButton) window.Shopify.PaymentButton.init();
      } catch (err) {
        closePanel(modal);
        window.location.href = trigger.dataset.quickView;
      }
    });

    document.addEventListener('click', (e) => {
      const add = e.target.closest('[data-quick-add]');
      if (!add) return;
      e.preventDefault();
      const fd = new FormData();
      fd.append('id', add.dataset.quickAdd);
      fd.append('quantity', '1');
      Cart.add(fd, add);
    });
  }

  /* ------------------------------------------------------------------ */
  /* Collection filters, sorting and grid toggle                         */
  /* ------------------------------------------------------------------ */
  function initCollection() {
    const container = $('[data-collection-container]');
    if (!container) return;
    const sectionId = container.dataset.sectionId;

    const render = async (params) => {
      const url = `${window.location.pathname}?${params}`;
      const grid = $('[data-collection-results]');
      grid?.classList.add('is-loading');
      try {
        const res = await fetch(`${url}${params ? '&' : ''}section_id=${sectionId}`);
        const doc = parseHTML(await res.text());
        ['[data-collection-results]', '[data-facets-body]', '[data-active-facets]', '[data-collection-count]'].forEach((sel) => {
          const fresh = doc.querySelector(sel);
          $$(sel).forEach((el) => { if (fresh) el.innerHTML = fresh.innerHTML; });
        });
        window.history.replaceState({}, '', url);
        applyGridCols();
        initReveal(container);
        container.dispatchEvent(new CustomEvent('heritage:collection:rendered'));
        document.dispatchEvent(new CustomEvent('heritage:cards:rendered', { detail: { el: $('[data-collection-results]') } }));
      } finally {
        $('[data-collection-results]')?.classList.remove('is-loading');
      }
    };

    const collectParams = () => {
      const form = $('[data-facets-form]');
      const fd = form ? new FormData(form) : new FormData();
      const sort = $('[data-sort-select]');
      if (sort) fd.set('sort_by', sort.value);
      const params = new URLSearchParams();
      for (const [k, v] of fd.entries()) if (v !== '') params.append(k, v);
      return params.toString();
    };

    const onFilterChange = debounce(() => render(collectParams()), 400);
    container.addEventListener('change', (e) => {
      if (e.target.closest('[data-facets-form]') || e.target.matches('[data-sort-select]')) onFilterChange();
    });
    container.addEventListener('submit', (e) => {
      if (e.target.closest('[data-facets-form]')) { e.preventDefault(); render(collectParams()); }
    });
    container.addEventListener('click', (e) => {
      const remove = e.target.closest('[data-facet-remove]');
      if (remove) {
        e.preventDefault();
        const url = new URL(remove.href, window.location.origin);
        render(url.searchParams.toString());
      }
    });

    // Grid density toggle
    const key = 'heritage-grid-cols';
    const applyGridCols = () => {
      let cols = null;
      try { cols = localStorage.getItem(key); } catch (e) { /* storage blocked */ }
      const grid = $('[data-collection-results] .grid');
      if (cols && grid) grid.style.setProperty('--cols', cols);
      $$('[data-grid-cols]').forEach((b) => b.classList.toggle('is-active', b.dataset.gridCols === (cols || b.closest('[data-default-cols]')?.dataset.defaultCols)));
    };
    container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-grid-cols]');
      if (!btn) return;
      try { localStorage.setItem(key, btn.dataset.gridCols); } catch (err) { /* ignore */ }
      applyGridCols();
    });
    applyGridCols();

    // Load more / infinite scroll. The block is re-rendered by the filters, so it is looked up on each use.
    let loading = false;
    let observer;
    const loadMore = async () => {
      const wrap = $('[data-load-more]', container);
      const btn = wrap && $('[data-load-more-btn]', wrap);
      if (!btn || loading) return;
      loading = true;
      wrap.classList.add('is-loading');
      try {
        const url = new URL(btn.href, window.location.origin);
        url.searchParams.set('section_id', sectionId);
        const doc = parseHTML(await (await fetch(url)).text());
        const grid = $('[data-collection-results] .grid', container);
        const freshGrid = doc.querySelector('[data-collection-results] .grid');
        const freshWrap = doc.querySelector('[data-load-more]');
        if (grid && freshGrid) {
          const added = Array.from(freshGrid.children);
          added.forEach((card) => grid.appendChild(card));
          initReveal(grid);
          document.dispatchEvent(new CustomEvent('heritage:cards:rendered', { detail: { el: grid } }));
          added[0]?.querySelector('a')?.focus({ preventScroll: true });
        }
        if (freshWrap) wrap.replaceWith(freshWrap);
        else wrap.remove();
        url.searchParams.delete('section_id');
        window.history.replaceState({}, '', url.pathname + url.search);
      } catch (err) {
        wrap.classList.remove('is-loading');
        window.location.href = btn.href;
      } finally {
        loading = false;
        watchInfinite();
      }
    };
    const watchInfinite = () => {
      observer?.disconnect();
      const wrap = $('[data-load-more][data-infinite]', container);
      if (!wrap || !$('[data-load-more-btn]', wrap) || !('IntersectionObserver' in window)) return;
      observer = new IntersectionObserver((entries) => {
        if (entries.some((en) => en.isIntersecting)) loadMore();
      }, { rootMargin: '600px 0px' });
      observer.observe(wrap);
    };
    container.addEventListener('click', (e) => {
      if (!e.target.closest('[data-load-more-btn]')) return;
      e.preventDefault();
      loadMore();
    });
    container.addEventListener('heritage:collection:rendered', watchInfinite);
    watchInfinite();
  }

  /* ------------------------------------------------------------------ */
  /* Slideshow                                                           */
  /* ------------------------------------------------------------------ */
  function initSlideshows(root = document) {
    $$('[data-slideshow]', root).forEach((el) => {
      if (el.dataset.ready) return;
      el.dataset.ready = '1';
      const track = el.querySelector('.slideshow__track');
      const slides = $$('.slide', el);
      const dots = $$('[data-slide-dot]', el);
      let index = 0;
      let timer;
      const go = (i) => {
        index = (i + slides.length) % slides.length;
        track.style.transform = `translateX(-${index * 100}%)`;
        slides.forEach((s, n) => { s.classList.toggle('is-active', n === index); s.setAttribute('aria-hidden', n !== index); });
        dots.forEach((d, n) => d.classList.toggle('is-active', n === index));
      };
      const play = () => {
        if (el.dataset.autoplay !== 'true' || slides.length < 2) return;
        clearInterval(timer);
        timer = setInterval(() => go(index + 1), parseInt(el.dataset.speed || '6', 10) * 1000);
      };
      dots.forEach((d, n) => d.addEventListener('click', () => { go(n); play(); }));
      el.querySelector('[data-slide-prev]')?.addEventListener('click', () => { go(index - 1); play(); });
      el.querySelector('[data-slide-next]')?.addEventListener('click', () => { go(index + 1); play(); });
      el.addEventListener('mouseenter', () => clearInterval(timer));
      el.addEventListener('mouseleave', play);
      let startX = null;
      el.addEventListener('touchstart', (e) => { startX = e.touches[0].clientX; }, { passive: true });
      el.addEventListener('touchend', (e) => {
        if (startX === null) return;
        const dx = e.changedTouches[0].clientX - startX;
        if (Math.abs(dx) > 40) go(index + (dx < 0 ? 1 : -1));
        startX = null;
        play();
      });
      el._go = go;
      go(0);
      play();
    });
  }

  /* ------------------------------------------------------------------ */
  /* Product recommendations                                             */
  /* ------------------------------------------------------------------ */
  function initRecommendations(root = document) {
    $$('[data-recommendations]', root).forEach(async (el) => {
      if (el.dataset.ready) return;
      el.dataset.ready = '1';
      try {
        const res = await fetch(el.dataset.url);
        const doc = parseHTML(await res.text());
        const fresh = doc.querySelector('[data-recommendations]');
        if (fresh && fresh.innerHTML.trim()) {
          el.innerHTML = fresh.innerHTML;
          initReveal(el);
        }
      } catch (e) { /* leave empty */ }
    });
  }

  /* ------------------------------------------------------------------ */
  /* Scroll reveal                                                       */
  /* ------------------------------------------------------------------ */
  let revealObserver;
  function initReveal(root = document) {
    if (!document.body.classList.contains('animations-enabled')) return;
    if (!('IntersectionObserver' in window)) {
      $$('[data-reveal]', root).forEach((el) => el.classList.add('is-revealed'));
      return;
    }
    revealObserver = revealObserver || new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-revealed');
          revealObserver.unobserve(entry.target);
        }
      });
    }, { rootMargin: '0px 0px -60px 0px' });
    $$('[data-reveal]:not(.is-revealed)', root).forEach((el) => revealObserver.observe(el));
  }

  /* ------------------------------------------------------------------ */
  /* Boot + theme editor hooks                                           */
  /* ------------------------------------------------------------------ */
  function init() {
    initHeader();
    initAnnouncements();
    initSearch();
    initCart();
    initQuickView();
    initCollection();
    initSlideshows();
    initRecommendations();
    initReveal();
    $$('[data-product-root]').forEach(initProduct);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  document.addEventListener('shopify:section:load', (e) => {
    initAnnouncements(e.target);
    initSlideshows(e.target);
    initRecommendations(e.target);
    $$('[data-reveal]', e.target).forEach((el) => el.classList.add('is-revealed'));
    $$('[data-product-root]', e.target).forEach(initProduct);
  });
  document.addEventListener('shopify:block:select', (e) => {
    const slide = e.target.closest('.slide');
    const show = slide?.closest('[data-slideshow]');
    if (show && show._go) show._go($$('.slide', show).indexOf(slide));
  });
})();
