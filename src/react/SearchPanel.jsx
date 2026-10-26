import React, { useEffect, useMemo, useRef, useState } from 'react';
import { fromSuggest, getJSON, money, sizedImage, storage, url } from './lib.js';

const RECENT_KEY = 'heritage-recent-searches';

// Live search for the header overlay: suggestions, products and collections as you type,
// recent and popular searches when the box is empty, and full keyboard control.
export default function SearchPanel({ popular, strings, unavailable = 'last' }) {
  const [q, setQ] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [recent, setRecent] = useState(() => storage.get(RECENT_KEY, []));
  const [active, setActive] = useState(-1);
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const modal = document.getElementById('SearchModal');
    const focus = () => setTimeout(() => inputRef.current?.focus(), 60);
    if (modal?.classList.contains('is-open')) focus();
    const observer = new MutationObserver(() => { if (modal.classList.contains('is-open')) focus(); });
    if (modal) observer.observe(modal, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const term = q.trim();
    setActive(-1);
    if (!term) { setResults(null); return undefined; }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await getJSON(url(`/search/suggest.json?q=${encodeURIComponent(term)}&resources[type]=product,collection,query,page&resources[limit]=6&resources[options][unavailable_products]=${unavailable}`), controller.signal);
        const r = data.resources.results;
        setResults({
          queries: (r.queries || []).slice(0, 5),
          products: (r.products || []).map(fromSuggest),
          collections: r.collections || [],
          pages: r.pages || []
        });
      } catch (e) {
        if (e.name !== 'AbortError') setResults({ queries: [], products: [], collections: [], pages: [] });
      } finally {
        setLoading(false);
      }
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [q]);

  const searchUrl = (term) => url(`/search?q=${encodeURIComponent(term)}&options[prefix]=last`);

  const remember = (term) => {
    const t = term.trim();
    if (!t) return;
    const next = [t, ...recent.filter((r) => r.toLowerCase() !== t.toLowerCase())].slice(0, 6);
    setRecent(next);
    storage.set(RECENT_KEY, next);
  };

  // Every link in the panel, in the order it renders, for arrow-key navigation.
  const items = useMemo(() => {
    if (!results) {
      return [...recent.map((t) => ({ href: searchUrl(t), term: t })), ...popular.map((t) => ({ href: searchUrl(t), term: t }))];
    }
    return [
      ...results.queries.map((s) => ({ href: searchUrl(s.text), term: s.text })),
      ...results.collections.map((c) => ({ href: c.url })),
      ...results.pages.map((pg) => ({ href: pg.url })),
      ...results.products.map((p) => ({ href: p.url }))
    ];
  }, [results, recent, popular]);

  const go = (item) => {
    if (item.term) remember(item.term);
    else remember(q);
    window.location.href = item.href;
  };

  const onKeyDown = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault();
      if (!items.length) return;
      const next = e.key === 'ArrowDown' ? (active + 1) % items.length : (active - 1 + items.length) % items.length;
      setActive(next);
      listRef.current?.querySelector(`[data-index="${next}"]`)?.scrollIntoView({ block: 'nearest' });
    } else if (e.key === 'Enter' && active >= 0 && items[active]) {
      e.preventDefault();
      go(items[active]);
    }
  };

  const onSubmit = (e) => {
    if (!q.trim()) { e.preventDefault(); return; }
    remember(q);
  };

  let index = -1;
  const linkProps = (item) => {
    index += 1;
    const i = index;
    return {
      href: item.href,
      'data-index': i,
      'aria-selected': i === active,
      role: 'option',
      id: `search-option-${i}`,
      onMouseEnter: () => setActive(i),
      onClick: (e) => { e.preventDefault(); go(item); }
    };
  };

  const empty = results && !results.queries.length && !results.products.length && !results.collections.length && !results.pages.length;

  return (
    <div className="page-width">
      <form action={url('/search')} method="get" role="search" className="search-modal__form" onSubmit={onSubmit}>
        <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="11" cy="11" r="7" /><path d="m20 20-4.2-4.2" /></svg>
        <input type="hidden" name="options[prefix]" value="last" />
        <input
          ref={inputRef}
          type="search"
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKeyDown}
          className="search-modal__input"
          placeholder={strings.placeholder}
          aria-label={strings.search}
          autoComplete="off"
          role="combobox"
          aria-expanded={items.length > 0}
          aria-controls="SearchPanelResults"
          aria-activedescendant={active >= 0 ? `search-option-${active}` : undefined}
        />
        {loading ? <span className="search-panel__spinner" aria-hidden="true" /> : null}
        {q ? <button type="button" className="tw-text-sm link-underline" onClick={() => { setQ(''); inputRef.current?.focus(); }}>{strings.clear}</button> : null}
        <button type="button" className="header-icon" data-close aria-label={strings.close}>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M5 5l14 14M19 5 5 19" /></svg>
        </button>
      </form>

      <div id="SearchPanelResults" ref={listRef} role="listbox" aria-label={strings.search} className="tw-py-6 tw-max-h-[70vh] tw-overflow-y-auto">
        {!results ? (
          <div className="tw-grid tw-gap-8 md:tw-grid-cols-2">
            {recent.length ? (
              <div>
                <div className="tw-flex tw-justify-between tw-items-baseline">
                  <p className="predictive-search__heading">{strings.recent}</p>
                  <button type="button" className="tw-text-xs link-underline" onClick={() => { setRecent([]); storage.set(RECENT_KEY, []); }}>{strings.clear}</button>
                </div>
                <div className="tw-flex tw-flex-wrap tw-gap-2">
                  {recent.map((t) => <a key={t} className="search-chip" {...linkProps({ href: searchUrl(t), term: t })}>{t}</a>)}
                </div>
              </div>
            ) : null}
            {popular.length ? (
              <div>
                <p className="predictive-search__heading">{strings.popular}</p>
                <div className="tw-flex tw-flex-wrap tw-gap-2">
                  {popular.map((t) => <a key={t} className="search-chip" {...linkProps({ href: searchUrl(t), term: t })}>{t}</a>)}
                </div>
              </div>
            ) : null}
          </div>
        ) : empty ? (
          <p>{strings.noResults.replace('{{ terms }}', q)}</p>
        ) : (
          <div className="tw-grid tw-gap-8 lg:tw-grid-cols-[1fr_3fr] tw-animate-fade-up">
            <div className="tw-space-y-6">
              {results.queries.length ? (
                <div>
                  <p className="predictive-search__heading">{strings.suggestions}</p>
                  <ul>
                    {results.queries.map((s) => (
                      <li key={s.text}>
                        <a className="search-row" {...linkProps({ href: searchUrl(s.text), term: s.text })} dangerouslySetInnerHTML={{ __html: s.styled_text || s.text }} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
              {results.collections.length || results.pages.length ? (
                <div>
                  <p className="predictive-search__heading">{strings.collections}</p>
                  <ul>
                    {results.collections.map((c) => <li key={c.url}><a className="search-row" {...linkProps({ href: c.url })}>{c.title}</a></li>)}
                    {results.pages.map((pg) => <li key={pg.url}><a className="search-row" {...linkProps({ href: pg.url })}>{pg.title}</a></li>)}
                  </ul>
                </div>
              ) : null}
            </div>
            {results.products.length ? (
              <div>
                <p className="predictive-search__heading">{strings.products}</p>
                <div className="predictive-search__products">
                  {results.products.map((p, i) => (
                    <a key={p.id} className="predictive-search__item search-product tw-animate-tile-in" style={{ animationDelay: `${i * 40}ms` }} {...linkProps({ href: p.url })}>
                      <span className="media media--product">
                        {p.image ? <img src={sizedImage(p.image, 300)} alt={p.alt} loading="lazy" /> : null}
                      </span>
                      <span>{p.title}</span>
                      <span className="price">
                        <span className={p.compareAt > p.price ? 'price__sale' : 'price__regular'}>{money(p.price)}</span>
                        {p.compareAt > p.price ? <s className="price__compare">{money(p.compareAt)}</s> : null}
                      </span>
                    </a>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        )}
        {results && !empty ? (
          <div className="predictive-search__footer">
            <a href={searchUrl(q)} className="btn btn--secondary" onClick={() => remember(q)}>{strings.viewAll}</a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
