/* Heritage video sections: video slideshow (Shopify, MP4, YouTube, Vimeo, sound and music) and shoppable video reels. */
(() => {

  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mobileQuery = window.matchMedia('(max-width: 749px)');
  const parse = (data) => {
    if (typeof data !== 'string') return data;
    try { return JSON.parse(data); } catch (e) { return null; }
  };

  /* ---------- Players: one small adapter per media type ---------- */

  class Html5Player {
    constructor(slide, host) {
      this.slide = slide;
      this.host = host;
      this.els = [...slide.querySelectorAll('video.vslide__el')];
      this.els.forEach((el) => {
        el.muted = true;
        el.playsInline = true;
        el.addEventListener('playing', () => { if (el === this.el) slide.classList.add('is-playing'); });
        el.addEventListener('timeupdate', () => { if (el === this.el && el.duration) host.setProgress(el.currentTime / el.duration); });
        el.addEventListener('ended', () => { if (el === this.el) host.onEnded(); });
      });
    }
    get el() {
      if (this.els.length < 2) return this.els[0];
      const wantMobile = mobileQuery.matches;
      return this.els.find((el) => el.closest('.vslide__video--mobile') ? wantMobile : !wantMobile) || this.els[0];
    }
    play(muted) {
      const el = this.el;
      if (!el) return;
      this.els.forEach((other) => { if (other !== el) other.pause(); });
      if (el.preload === 'none') el.preload = 'auto';
      el.muted = muted;
      const p = el.play();
      if (p && p.catch) p.catch(() => {
        // Sound blocked by the browser: fall back to muted playback.
        el.muted = true;
        this.host.soundBlocked();
        el.play().catch(() => {});
      });
    }
    pause() { this.els.forEach((el) => el.pause()); }
    mute(muted) { const el = this.el; if (el) el.muted = muted; }
    restart() { const el = this.el; if (el) { try { el.currentTime = 0; } catch (e) { /* not loaded yet */ } } }
  }

  class EmbedPlayer {
    constructor(slide, host, kind) {
      this.slide = slide;
      this.host = host;
      this.kind = kind;
      this.iframe = slide.querySelector('iframe.vslide__el');
      this.ready = false;
      this.queue = [];
      this.onMessage = this.onMessage.bind(this);
      window.addEventListener('message', this.onMessage);
    }
    load() {
      if (this.iframe.src) return;
      this.iframe.src = this.iframe.dataset.src;
      this.iframe.addEventListener('load', () => this.handshake(), { once: true });
    }
    handshake() {
      let tries = 0;
      const ping = () => {
        if (this.ready || tries++ > 20 || !this.iframe.contentWindow) return;
        if (this.kind === 'youtube') this.post({ event: 'listening', id: this.host.uid, channel: 'widget' });
        else this.post({ method: 'ping' });
        setTimeout(ping, 250);
      };
      ping();
      if (this.kind === 'vimeo') this.onReady();
    }
    onReady() {
      if (this.ready) return;
      this.ready = true;
      if (this.kind === 'vimeo') {
        ['play', 'ended', 'timeupdate'].forEach((name) => this.post({ method: 'addEventListener', value: name }));
      }
      const q = this.queue; this.queue = [];
      q.forEach((cmd) => cmd());
    }
    post(msg) {
      if (!this.iframe.contentWindow) return;
      const origin = this.kind === 'youtube' ? '*' : 'https://player.vimeo.com';
      this.iframe.contentWindow.postMessage(JSON.stringify(msg), origin);
    }
    cmd(name, value) {
      const run = () => {
        if (this.kind === 'youtube') this.post({ event: 'command', func: name, args: value === undefined ? [] : value });
        else this.post(value === undefined ? { method: name } : { method: name, value });
      };
      if (this.ready) run(); else this.queue.push(run);
    }
    onMessage(e) {
      if (e.source !== this.iframe.contentWindow) return;
      const data = parse(e.data);
      if (!data) return;
      if (this.kind === 'youtube') {
        if (data.event === 'onReady' || data.event === 'initialDelivery') this.onReady();
        const info = data.info || {};
        const state = data.event === 'onStateChange' ? info : info.playerState;
        if (state === 1) this.slide.classList.add('is-playing');
        if (state === 0 && this.slide.classList.contains('is-active')) this.host.onEnded();
        if (typeof info.currentTime === 'number' && info.duration) this.host.setProgress(info.currentTime / info.duration, this.slide);
      } else {
        if (data.event === 'ready') this.onReady();
        if (data.event === 'play' || data.event === 'playProgress') this.slide.classList.add('is-playing');
        if (data.event === 'timeupdate' && data.data) {
          this.slide.classList.add('is-playing');
          if (data.data.duration) this.host.setProgress(data.data.seconds / data.data.duration, this.slide);
        }
        if (data.event === 'ended' && this.slide.classList.contains('is-active')) this.host.onEnded();
      }
    }
    play(muted) {
      this.load();
      this.mute(muted);
      this.cmd(this.kind === 'youtube' ? 'playVideo' : 'play');
    }
    pause() { if (this.iframe.src) this.cmd(this.kind === 'youtube' ? 'pauseVideo' : 'pause'); }
    mute(muted) {
      if (this.kind === 'youtube') { this.cmd(muted ? 'mute' : 'unMute'); if (!muted) this.cmd('setVolume', [100]); }
      else this.cmd('setVolume', muted ? 0 : 1);
    }
    restart() {
      if (!this.iframe.src) return;
      if (this.kind === 'youtube') this.cmd('seekTo', [0, true]);
      else this.cmd('setCurrentTime', 0);
    }
    destroy() { window.removeEventListener('message', this.onMessage); }
  }

  /* ---------- The slideshow ---------- */

  let counter = 0;

  class VideoSlideshow extends HTMLElement {
    connectedCallback() {
      this.uid = `vs-${++counter}`;
      this.slides = [...this.querySelectorAll('.vslide')];
      this.dots = [...this.querySelectorAll('[data-vs-dot]')];
      this.track = this.querySelector('.vslideshow__track');
      this.progressEl = this.querySelector('[data-vs-progress]');
      this.audio = this.querySelector('[data-vs-audio]');
      this.players = new Map();
      this.index = 0;
      this.playing = !reduceMotion;
      this.inView = false;
      this.soundOn = false;
      this.musicOn = false;
      this.userStoppedMusic = false;
      this.videoEnd = this.dataset.videoEnd || 'loop';
      this.autoplayImages = this.dataset.autoplay === 'true';
      this.speed = (parseFloat(this.dataset.speed) || 7) * 1000;
      this.cleanups = [];

      this.on(this.querySelector('[data-vs-prev]'), 'click', () => this.go(this.index - 1, true));
      this.on(this.querySelector('[data-vs-next]'), 'click', () => this.go(this.index + 1, true));
      this.dots.forEach((dot) => this.on(dot, 'click', () => this.go(parseInt(dot.dataset.vsDot, 10), true)));
      this.on(this.querySelector('[data-vs-play]'), 'click', () => this.setPlaying(!this.playing));
      this.on(this.querySelector('[data-vs-sound]'), 'click', () => this.setSound(!this.soundOn));
      this.on(this.querySelector('[data-vs-music]'), 'click', () => {
        this.userStoppedMusic = this.musicOn;
        this.setMusic(!this.musicOn);
      });
      this.querySelectorAll('[data-vs-watch]').forEach((btn) => this.on(btn, 'click', () => this.openModal(btn)));
      this.querySelectorAll('[data-vs-close]').forEach((btn) => this.on(btn, 'click', () => this.closeModal()));
      this.on(document, 'keydown', (e) => { if (e.key === 'Escape' && this.modalOpen) this.closeModal(); });
      this.on(this, 'keydown', (e) => {
        if (this.modalOpen || e.target.closest('input, textarea')) return;
        if (e.key === 'ArrowLeft') this.go(this.index - 1, true);
        if (e.key === 'ArrowRight') this.go(this.index + 1, true);
      });
      this.setupSwipe();
      this.setupMusic();
      this.on(mobileQuery, 'change', () => this.startCurrent(true));

      this.observer = new IntersectionObserver(([entry]) => {
        this.inView = entry.isIntersecting;
        if (this.inView) this.startCurrent(); else this.stopCurrent();
      }, { threshold: 0.25 });
      this.observer.observe(this);

      // Theme editor: show the selected slide and hold it there.
      this.on(document, 'shopify:block:select', (e) => {
        const i = this.slides.indexOf(e.target);
        if (i > -1) { this.editorHold = true; this.go(i, false); }
      });
      this.on(document, 'shopify:block:deselect', (e) => {
        if (this.slides.includes(e.target)) { this.editorHold = false; this.startCurrent(); }
      });

      this.updatePlayButton();
      this.activate(0);
    }

    disconnectedCallback() {
      this.cleanups.forEach((fn) => fn());
      this.cleanups = [];
      if (this.observer) this.observer.disconnect();
      this.players.forEach((p) => { p.pause(); if (p.destroy) p.destroy(); });
      cancelAnimationFrame(this.raf);
      if (this.audio) this.audio.pause();
    }

    on(target, type, fn, opts) {
      if (!target) return;
      target.addEventListener(type, fn, opts);
      this.cleanups.push(() => target.removeEventListener(type, fn, opts));
    }

    player(slide) {
      if (!this.players.has(slide)) {
        const kind = slide.dataset.kind;
        let p = null;
        if (kind === 'shopify' || kind === 'mp4') p = new Html5Player(slide, this);
        else if (kind === 'youtube' || kind === 'vimeo') p = new EmbedPlayer(slide, this, kind);
        this.players.set(slide, p);
      }
      return this.players.get(slide);
    }

    get current() { return this.slides[this.index]; }

    go(i, byUser) {
      const n = this.slides.length;
      if (n < 2) return;
      const next = (i + n) % n;
      if (next === this.index) return;
      this.stopCurrent(true);
      this.index = next;
      this.activate(next);
      if (byUser && !this.playing && !reduceMotion) this.setPlaying(true);
    }

    activate(i) {
      this.slides.forEach((s, k) => {
        const active = k === i;
        s.classList.toggle('is-active', active);
        s.setAttribute('aria-hidden', active ? 'false' : 'true');
        s.querySelectorAll('a, button').forEach((el) => { el.tabIndex = active ? 0 : -1; });
      });
      this.dots.forEach((d, k) => {
        d.classList.toggle('is-active', k === i);
        d.setAttribute('aria-current', k === i ? 'true' : 'false');
      });
      if (this.classList.contains('vslideshow--slide')) this.track.style.transform = `translateX(${-100 * i}%)`;
      this.setProgress(0);
      // Warm up the next embed so switching feels instant.
      const upcoming = this.slides[(i + 1) % this.slides.length];
      const up = upcoming && upcoming !== this.current ? this.player(upcoming) : null;
      if (up && up.load && this.inView) setTimeout(() => up.load(), 1500);
      this.startCurrent();
    }

    startCurrent(force) {
      cancelAnimationFrame(this.raf);
      if (!this.inView || !this.playing || this.modalOpen) return;
      const slide = this.current;
      const p = this.player(slide);
      if (p) {
        p.play(!this.soundOn);
        return;
      }
      if (force) return;
      if (this.autoplayImages && this.slides.length > 1 && !this.editorHold) this.runTimer();
    }

    stopCurrent(reset) {
      cancelAnimationFrame(this.raf);
      this.timerElapsed = reset ? 0 : this.timerElapsed;
      const p = this.players.get(this.current);
      if (p) {
        p.pause();
        if (reset) p.restart();
      }
    }

    runTimer() {
      const start = performance.now() - (this.timerElapsed || 0);
      const tick = (now) => {
        this.timerElapsed = now - start;
        const t = Math.min(this.timerElapsed / this.speed, 1);
        this.setProgress(t);
        if (t >= 1) { this.timerElapsed = 0; this.go(this.index + 1); return; }
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    }

    onEnded() {
      if (this.videoEnd === 'next' && this.slides.length > 1 && !this.editorHold) this.go(this.index + 1);
      else {
        // Embeds without native loop support: start the same video again.
        const p = this.player(this.current);
        if (p) { p.restart(); p.play(!this.soundOn); }
      }
    }

    setProgress(t, slide) {
      if (slide && slide !== this.current) return;
      const v = Math.max(0, Math.min(1, t || 0));
      if (this.progressEl) this.progressEl.style.transform = `scaleX(${v})`;
      this.dots.forEach((d, k) => d.style.setProperty('--vs-p', k === this.index ? v : 0));
    }

    setPlaying(on) {
      this.playing = on;
      this.updatePlayButton();
      if (on) this.startCurrent(); else this.stopCurrent(false);
    }

    updatePlayButton() {
      const btn = this.querySelector('[data-vs-play]');
      this.classList.toggle('is-paused', !this.playing);
      if (btn) btn.setAttribute('aria-label', this.playing ? btn.dataset.labelPause : btn.dataset.labelPlay);
    }

    setSound(on) {
      this.soundOn = on;
      const btn = this.querySelector('[data-vs-sound]');
      this.classList.toggle('is-sound-on', on);
      if (btn) {
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.setAttribute('aria-label', on ? btn.dataset.labelOff : btn.dataset.labelOn);
      }
      if (on && this.musicOn) this.setMusic(false);
      const p = this.players.get(this.current);
      if (p) {
        p.mute(!on);
        if (on && !this.playing) this.setPlaying(true);
      }
    }

    soundBlocked() { if (this.soundOn) this.setSound(false); }

    setupMusic() {
      if (!this.audio) return;
      this.audio.volume = Math.max(0, Math.min(1, parseFloat(this.dataset.musicVolume) || 0.5));
      if (this.dataset.musicFirstClick === 'true') {
        const start = (e) => {
          if (e.target.closest && e.target.closest('[data-vs-music], [data-vs-sound]')) return;
          if (!this.userStoppedMusic && !this.musicOn && !this.soundOn) this.setMusic(true);
        };
        this.on(document, 'pointerdown', start, { once: true });
        this.on(document, 'keydown', start, { once: true });
      }
    }

    setMusic(on) {
      if (!this.audio) return;
      this.musicOn = on;
      const btn = this.querySelector('[data-vs-music]');
      this.classList.toggle('is-music-on', on);
      if (btn) {
        btn.setAttribute('aria-pressed', on ? 'true' : 'false');
        btn.setAttribute('aria-label', on ? btn.dataset.labelOff : btn.dataset.labelOn);
      }
      if (on) {
        if (this.soundOn) this.setSound(false);
        const p = this.audio.play();
        if (p && p.catch) p.catch(() => { this.musicOn = false; this.classList.remove('is-music-on'); });
      } else {
        this.audio.pause();
      }
    }

    setupSwipe() {
      let x0 = null; let y0 = null;
      this.on(this.track, 'pointerdown', (e) => { if (e.pointerType !== 'mouse') { x0 = e.clientX; y0 = e.clientY; } });
      this.on(this.track, 'pointerup', (e) => {
        if (x0 === null) return;
        const dx = e.clientX - x0; const dy = e.clientY - y0;
        x0 = null;
        if (Math.abs(dx) > 45 && Math.abs(dx) > Math.abs(dy)) this.go(this.index + (dx < 0 ? 1 : -1), true);
      });
      this.on(this.track, 'pointercancel', () => { x0 = null; });
    }

    openModal(btn) {
      const modal = this.querySelector('[data-vs-modal]');
      const body = this.querySelector('[data-vs-modal-body]');
      const { kind, id, src } = btn.dataset;
      let html = '';
      if (kind === 'youtube' && id) html = `<iframe src="https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=1&rel=0&playsinline=1&modestbranding=1" allow="autoplay; encrypted-media; picture-in-picture; fullscreen" allowfullscreen title="Video"></iframe>`;
      else if (kind === 'vimeo' && id) html = `<iframe src="https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=1&dnt=1" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen title="Video"></iframe>`;
      else if (src) html = '<video controls autoplay playsinline></video>';
      if (!html) return;
      body.innerHTML = html;
      const v = body.querySelector('video');
      if (v) v.src = src;
      this.modalOpen = true;
      this.wasPlaying = this.playing;
      this.wasMusic = this.musicOn;
      this.stopCurrent(false);
      if (this.musicOn) this.setMusic(false);
      modal.hidden = false;
      document.documentElement.classList.add('vs-modal-open');
      this.lastFocus = btn;
      requestAnimationFrame(() => modal.querySelector('.vslideshow__modal-close').focus());
    }

    closeModal() {
      const modal = this.querySelector('[data-vs-modal]');
      if (!this.modalOpen) return;
      this.querySelector('[data-vs-modal-body]').innerHTML = '';
      modal.hidden = true;
      this.modalOpen = false;
      document.documentElement.classList.remove('vs-modal-open');
      if (this.wasMusic) this.setMusic(true);
      if (this.wasPlaying) this.startCurrent();
      if (this.lastFocus) this.lastFocus.focus();
    }
  }

  if (!customElements.get('video-slideshow')) customElements.define('video-slideshow', VideoSlideshow);

  /* ---------- Video reels: shoppable short videos ---------- */

  class VideoReels extends HTMLElement {
    connectedCallback() {
      this.items = [...this.querySelectorAll('[data-vr-item]')];
      this.track = this.querySelector('[data-vr-track]');
      this.modal = this.querySelector('[data-vr-modal]');
      this.modalVideo = this.querySelector('[data-vr-modal-video]');
      this.mode = reduceMotion ? 'none' : this.dataset.play;
      this.muted = false;
      this.cleanups = [];
      const on = (t, type, fn, o) => { if (!t) return; t.addEventListener(type, fn, o); this.cleanups.push(() => t.removeEventListener(type, fn, o)); };
      this.on = on;

      this.querySelectorAll('[data-vr-scroll]').forEach((btn) => on(btn, 'click', () => {
        const card = this.items[0];
        const step = card ? card.getBoundingClientRect().width + 16 : 300;
        this.track.scrollBy({ left: step * parseInt(btn.dataset.vrScroll, 10) * (window.innerWidth < 750 ? 1 : 2), behavior: 'smooth' });
      }));
      this.querySelectorAll('[data-vr-open]').forEach((btn) => on(btn, 'click', () => this.open(parseInt(btn.dataset.vrOpen, 10))));
      this.querySelectorAll('[data-vr-close]').forEach((btn) => on(btn, 'click', () => this.close()));
      this.querySelectorAll('[data-vr-step]').forEach((btn) => on(btn, 'click', () => this.open(this.current + parseInt(btn.dataset.vrStep, 10))));
      on(this.querySelector('[data-vr-sound]'), 'click', () => this.setMuted(!this.muted));
      on(this.modalVideo, 'timeupdate', () => {
        const v = this.modalVideo;
        const bar = this.querySelector('[data-vr-progress]');
        if (bar && v.duration) bar.style.transform = `scaleX(${v.currentTime / v.duration})`;
      });
      on(this.modalVideo, 'click', () => { if (this.modalVideo.paused) this.modalVideo.play(); else this.modalVideo.pause(); });
      on(document, 'keydown', (e) => {
        if (this.modal.hidden) return;
        if (e.key === 'Escape') this.close();
        if (e.key === 'ArrowLeft') this.open(this.current - 1);
        if (e.key === 'ArrowRight') this.open(this.current + 1);
      });

      this.setMuted(false);

      if (this.mode === 'inview') {
        this.observer = new IntersectionObserver((entries) => {
          entries.forEach((entry) => {
            if (entry.isIntersecting && entry.intersectionRatio > 0.6) this.preview(entry.target, true);
            else this.preview(entry.target, false);
          });
        }, { threshold: [0, 0.6, 1] });
        this.items.forEach((item) => this.observer.observe(item));
      } else if (this.mode === 'hover' && window.matchMedia('(hover: hover)').matches) {
        this.items.forEach((item) => {
          on(item, 'mouseenter', () => this.preview(item, true));
          on(item, 'mouseleave', () => this.preview(item, false));
        });
      }
    }

    disconnectedCallback() {
      this.cleanups.forEach((fn) => fn());
      if (this.observer) this.observer.disconnect();
      document.documentElement.classList.remove('vs-modal-open');
    }

    preview(item, play) {
      const v = item.querySelector('.vreel__video');
      if (!v || !item.dataset.src) return;
      if (play && this.modal.hidden) {
        if (!v.src) v.src = item.dataset.src;
        v.muted = true;
        v.play().then(() => item.classList.add('is-playing')).catch(() => {});
      } else {
        v.pause();
      }
    }

    open(i) {
      const n = this.items.length;
      if (!n) return;
      this.current = (i + n) % n;
      const item = this.items[this.current];
      if (!item.dataset.src) return;
      this.items.forEach((it) => this.preview(it, false));
      const v = this.modalVideo;
      v.src = item.dataset.src;
      v.muted = this.muted;
      const bar = this.querySelector('[data-vr-progress]');
      if (bar) bar.style.transform = 'scaleX(0)';
      const caption = item.querySelector('.vreel__caption');
      this.querySelector('[data-vr-caption]').textContent = caption ? caption.textContent : '';
      const tpl = item.querySelector('template[data-vr-product]');
      const slot = this.querySelector('[data-vr-modal-product]');
      slot.innerHTML = '';
      if (tpl) slot.appendChild(tpl.content.cloneNode(true));
      const wasHidden = this.modal.hidden;
      this.modal.hidden = false;
      document.documentElement.classList.add('vs-modal-open');
      v.play().catch(() => { v.muted = true; this.setMuted(true); v.play().catch(() => {}); });
      if (wasHidden) {
        this.lastFocus = document.activeElement;
        requestAnimationFrame(() => this.querySelector('.vreels-modal__close').focus());
      }
    }

    close() {
      this.modalVideo.pause();
      this.modalVideo.removeAttribute('src');
      this.modalVideo.load();
      this.modal.hidden = true;
      document.documentElement.classList.remove('vs-modal-open');
      if (this.lastFocus) this.lastFocus.focus();
      if (this.mode === 'inview' && this.observer) this.items.forEach((item) => { this.observer.unobserve(item); this.observer.observe(item); });
    }

    setMuted(m) {
      this.muted = m;
      this.modalVideo.muted = m;
      const btn = this.querySelector('[data-vr-sound]');
      this.classList.toggle('is-sound-on', !m);
      if (btn) {
        btn.setAttribute('aria-pressed', m ? 'false' : 'true');
        btn.setAttribute('aria-label', m ? btn.dataset.labelOn : btn.dataset.labelOff);
      }
    }
  }

  if (!customElements.get('video-reels')) customElements.define('video-reels', VideoReels);
})();
