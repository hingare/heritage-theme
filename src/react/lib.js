// Shared helpers for the React islands. Everything reads window.theme / window.Shopify,
// which layout/theme.liquid and Shopify set before these scripts run.

export const routeRoot = () => ((window.theme && window.theme.routes.root) || '/').replace(/\/$/, '');

export const url = (path) => `${routeRoot()}${path}`;

const currency = () => (window.Shopify && window.Shopify.currency && window.Shopify.currency.active) || 'USD';
const locale = () => document.documentElement.lang || undefined;

// Prices from the storefront JSON endpoints are decimal strings ("150.00") or cents (15000).
export function money(value, { cents = false } = {}) {
  if (value === null || value === undefined || value === '') return '';
  const amount = cents ? Number(value) / 100 : Number(value);
  try {
    return new Intl.NumberFormat(locale(), { style: 'currency', currency: currency() }).format(amount);
  } catch (e) {
    return amount.toFixed(2);
  }
}

// Ask the Shopify CDN for a smaller rendition of a product image.
export function sizedImage(src, width) {
  if (!src) return '';
  const u = new URL(src, window.location.origin);
  u.searchParams.set('width', String(width));
  return u.toString();
}

export async function getJSON(path, signal) {
  const res = await fetch(url(path), { signal, headers: { Accept: 'application/json' } });
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

export const storage = {
  get(key, fallback) {
    try { const v = localStorage.getItem(key); return v === null ? fallback : JSON.parse(v); } catch (e) { return fallback; }
  },
  set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch (e) { /* storage blocked */ }
  }
};

// Normalise a product from /products.json or /collections/<handle>/products.json.
export function fromProductsJson(p) {
  const variants = p.variants || [];
  const prices = variants.map((v) => Number(v.price));
  const compare = variants.map((v) => Number(v.compare_at_price || 0));
  const price = prices.length ? Math.min(...prices) : 0;
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    url: url(`/products/${p.handle}`),
    tags: (Array.isArray(p.tags) ? p.tags : String(p.tags || '').split(',')).map((t) => t.trim().toLowerCase()).filter(Boolean),
    image: p.images && p.images[0] ? p.images[0].src : '',
    image2: p.images && p.images[1] ? p.images[1].src : '',
    alt: p.title,
    price,
    compareAt: Math.max(0, ...compare),
    variesInPrice: new Set(prices).size > 1,
    available: variants.some((v) => v.available),
    singleVariantId: variants.length === 1 ? variants[0].id : null
  };
}

// Normalise a product from /search/suggest.json.
export function fromSuggest(p) {
  return {
    id: p.id,
    handle: p.handle,
    title: p.title,
    url: p.url,
    image: p.image || (p.featured_image && p.featured_image.url) || '',
    image2: '',
    alt: (p.featured_image && p.featured_image.alt) || p.title,
    price: Number(p.price_min || p.price || 0),
    compareAt: Number(p.compare_at_price_max || 0),
    variesInPrice: p.price_min !== p.price_max,
    available: p.available !== false,
    singleVariantId: null
  };
}

// Let the vanilla scripts (wishlist hearts, reveal) catch up after React renders tiles.
export const announceCards = (el) => document.dispatchEvent(new CustomEvent('heritage:cards:rendered', { detail: { el } }));
