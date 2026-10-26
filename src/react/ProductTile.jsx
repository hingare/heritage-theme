import React from 'react';
import { money, sizedImage } from './lib.js';

// A product tile that reuses the theme's own card classes, so it looks like the Liquid cards
// and works with the existing quick view, quick add and wishlist scripts.
export default function ProductTile({ product, strings, quickView = true, wishlist = true, delay = 0 }) {
  const onSale = product.compareAt > product.price;
  const percent = onSale ? Math.round(((product.compareAt - product.price) * 100) / product.compareAt) : 0;
  return (
    <div className="product-card tw-animate-tile-in" style={{ animationDelay: `${delay}ms` }}>
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

      <div className="product-card__badges">
        {!product.available ? <span className="badge badge--sold-out">{strings.soldOut}</span>
          : onSale ? <span className="badge badge--sale">-{percent}%</span> : null}
      </div>

      {wishlist && window.theme?.settings.wishlist ? (
        <button type="button" className="wishlist-btn product-card__wishlist" data-wishlist-toggle={product.handle} aria-pressed="false" aria-label={`${strings.wishlistAdd}: ${product.title}`} data-label-add={strings.wishlistAdd} data-label-remove={strings.wishlistRemove}>
          <svg aria-hidden="true" focusable="false" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 20s-8-4.5-8-11a4.5 4.5 0 0 1 8-2.8A4.5 4.5 0 0 1 20 9c0 6.5-8 11-8 11Z" /></svg>
        </button>
      ) : null}

      {quickView && product.available ? (
        <div className="product-card__actions">
          {product.singleVariantId ? (
            <button type="button" className="btn btn--small" data-quick-add={product.singleVariantId}>{strings.quickAdd}</button>
          ) : (
            <button type="button" className="btn btn--small" data-quick-view={product.url}>{strings.quickView}</button>
          )}
        </div>
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
