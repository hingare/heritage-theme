import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import ProductTile from './ProductTile.jsx';
import { announceCards, fromProductsJson, getJSON } from './lib.js';

// Tabs that swap between collections without a page load. Products come from the
// public /collections/<handle>/products.json endpoint and are cached per tab.
export default function CollectionTabs({ tabs, limit, columns, strings, showViewAll }) {
  const [active, setActive] = useState(0);
  const [cache, setCache] = useState({});
  const [error, setError] = useState(false);
  const gridRef = useRef(null);
  const tabRefs = useRef([]);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const tab = tabs[active];
  const products = tab ? cache[tab.handle] : null;

  useEffect(() => {
    if (!tab || cache[tab.handle]) return undefined;
    const controller = new AbortController();
    setError(false);
    getJSON(`/collections/${tab.handle}/products.json?limit=${limit}`, controller.signal)
      .then((data) => setCache((c) => ({ ...c, [tab.handle]: (data.products || []).map(fromProductsJson) })))
      .catch((e) => { if (e.name !== 'AbortError') setError(true); });
    return () => controller.abort();
  }, [tab, limit, cache]);

  useLayoutEffect(() => {
    const el = tabRefs.current[active];
    if (el) setIndicator({ left: el.offsetLeft, width: el.offsetWidth });
  }, [active, tabs.length]);

  useEffect(() => {
    if (products && gridRef.current) announceCards(gridRef.current);
  }, [products]);

  const onKeyDown = (e) => {
    if (e.key !== 'ArrowRight' && e.key !== 'ArrowLeft') return;
    const next = (active + (e.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length;
    setActive(next);
    tabRefs.current[next]?.focus();
  };

  if (!tabs.length) return null;

  return (
    <div>
      <div className="tab-row tw-mb-8" role="tablist" aria-label={strings.label} onKeyDown={onKeyDown}>
        <div className="tw-relative tw-flex tw-gap-6 md:tw-gap-10 tw-px-2 tw-mx-auto">
          {tabs.map((t, i) => (
            <button
              key={t.handle}
              ref={(el) => { tabRefs.current[i] = el; }}
              type="button"
              role="tab"
              id={`tab-${t.id}`}
              aria-selected={i === active}
              aria-controls={`panel-${t.id}`}
              tabIndex={i === active ? 0 : -1}
              onClick={() => setActive(i)}
              className={`tw-whitespace-nowrap tw-py-3 tw-font-heading tw-text-xl md:tw-text-2xl tw-transition-opacity ${i === active ? 'tw-opacity-100' : 'tw-opacity-40 hover:tw-opacity-80'}`}
            >
              {t.title}
            </button>
          ))}
          <span className="tw-absolute tw-bottom-0 tw-h-0.5 tw-bg-text tw-transition-all tw-duration-300 tw-ease-out" style={{ left: indicator.left, width: indicator.width }} aria-hidden="true" />
        </div>
      </div>

      <div id={`panel-${tab.id}`} role="tabpanel" aria-labelledby={`tab-${tab.id}`} aria-busy={!products && !error}>
        {error ? (
          <p className="tw-text-center">{strings.error}</p>
        ) : !products ? (
          <div className="grid" style={{ '--cols': columns }}>
            {Array.from({ length: Math.min(limit, columns) }).map((_, i) => (
              <div key={i}>
                <div className="media media--product tw-animate-pulse" />
                <div className="tw-h-3 tw-mt-4 tw-w-3/4 tw-rounded tw-bg-alt tw-animate-pulse" />
                <div className="tw-h-3 tw-mt-2 tw-w-1/3 tw-rounded tw-bg-alt tw-animate-pulse" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <p className="tw-text-center">{strings.empty}</p>
        ) : (
          <div ref={gridRef} key={tab.handle} className="grid grid--scroll-mobile" style={{ '--cols': columns }}>
            {products.map((p, i) => <ProductTile key={p.id} product={p} strings={strings} delay={i * 60} />)}
          </div>
        )}
        {showViewAll && tab.url ? (
          <div className="tw-text-center tw-mt-10">
            <a href={tab.url} className="btn btn--secondary">{strings.viewAll} {tab.title}</a>
          </div>
        ) : null}
      </div>
    </div>
  );
}
