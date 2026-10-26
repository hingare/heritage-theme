import React from 'react';
import { money, sizedImage } from './lib.js';

// A product tile that reuses the theme's own card classes, so it looks like the Liquid cards
// and works with the existing quick view, quick add and wishlist scripts.
export default function ProductTile({ product, strings, quickView = true, wishlist = true, delay = 0 }) {
  const onSale = product.compareAt > product.price;
  const percent = onSale ? Math.round(((product.compareAt - product.price) * 100) / product.compareAt) : 0;
  // Follow the same theme settings as snippets/product-card.liquid.
  const cards = window.theme?.settings?.cards || {};
  const showActions = quickView && product.available && (cards.quickAdd !== false || cards.quickView !== false);
  const classes = ['product-card', 'tw-animate-tile-in'];
  if (cards.hoverZoom !== false) classes.push('product-card--zoom');
  if (cards.align === 'center') classes.push('product-card--center');
  const plus = <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><path d="M12 5v14M5 12h14" /></svg>;
  return (
    <div className={classes.join(' ')} style={{ animationDelay: `${delay}ms` }}>
      <div className="product-card__media-wrap">
      <a href={product.url} className="product-card__media" tabIndex={-1} aria-hidden="true">
        <div className={`media media--product${product.image2 ? ' media--has-secondary' : ''}`}>
          {product.image ? (
            <img src={sizedImage(product.image, 600)} srcSet={`${sizedImage(product.image, 400)} 400w, ${sizedImage(product.image, 600)} 600w, ${sizedImage(product.image, 900)} 900w`} sizes="(min-width: 990px) 25vw, 50vw" alt={product.alt} loading="lazy" className="product-card__image--primary" />
          ) : null}
          {product.image2 ? (
            <img src={sizedImage(product.image2, 600)} alt="" loading="lazy" className="product-card__image--secondary" />
          ) : null}
        </div>
      </a>
      {showActions && cards.quickAdd !== false && cards.mobileAdd !== false ? (
        product.singleVariantId
          ? <button type="button" className="product-card__mobile-add" data-quick-add={product.singleVariantId} aria-label={`${strings.quickAdd}: ${product.title}`}>{plus}</button>
          : <button type="button" className="product-card__mobile-add" data-quick-view={product.url} aria-label={`${strings.quickAdd}: ${product.title}`}>{plus}</button>
      ) : null}
      {showActions ? (
        <div className="product-card__actions">
          {product.singleVariantId ? (
            <button type="button" className="btn btn--small" data-quick-add={product.singleVariantId}>{strings.quickAdd}</button>
          ) : (
            <button type="button" className="btn btn--small" data-quick-view={product.url}>{strings.quickView}</button>
          )}
        </div>
      ) : null}
      </div>


      <div className="product-card__badges">
        {!product.available ? (cards.soldOutBadge !== false ? <span className="badge badge--sold-out">{strings.soldOut}</span> : null)
          : onSale ? <span className="badge badge--sale">{cards.salePercent === false ? strings.sale : `-${percent}%`}</span> : null}
      </div>

      {wishlist && window.theme?.settings.wishlist ? (
        <button type="button" className="wishlist-btn product-card__wishlist" data-wishlist-toggle={product.handle} aria-pressed="false" aria-label={`${strings.wishlistAdd}: ${product.title}`} data-label-add={strings.wishlistAdd} data-label-remove={strings.wishlistRemove}>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.5-8 11-8 11Z" /></svg>
        </button>
      ) : null}


      <div className="product-card__info">
        <a href={product.url} className="product-card__title">{product.title}</a>
        <div className="price">
          <span className={onSale ? 'price__sale' : 'price__regular'}>
            {product.variesInPrice ? `${strings.from} ` : ''}{money(product.price)}
          </span>
          {onSale ? <s className="price__compare">{money(product.compareAt)}</s> : null}
        </div>
      </div>
    </div>
  );
}
