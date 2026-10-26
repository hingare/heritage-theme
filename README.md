# Heritage 4.99

An original Shopify Online Store 2.0 theme with an Impulse-style layout and feature set.
Written from scratch; it contains no code from Archetype Themes' Impulse.

The theme is store-agnostic: nothing about any one store is hard-coded. Each store's
look lives in its theme settings and JSON templates, so the same code can run on several stores.

## Features
- Sticky header, mega menu (automatic for 3-level menus, or via "Mega menu" blocks with promo images), mobile drawer menu
- Rotating announcement bar, predictive search overlay
- Promotion grid, slideshow, collection list, featured collection, featured product, image with text,
  icon columns, testimonials, logo list, background video, scrolling text, blog posts, newsletter, custom Liquid
- Product tiles with hover image, sale/sold-out/new badges, colour swatches, quick view and quick add
- Product page: thumbnail or stacked gallery, image zoom, button/swatch/dropdown variant picker, inventory status,
  trust badges, collapsible tabs, share buttons, sticky add-to-cart bar, recommendations
- Collection page: storefront filters (Search & Discovery), sorting, grid-size toggle, AJAX updates, mobile filter drawer
- Cart drawer with free-shipping progress bar, order notes, terms checkbox; full cart page
- Customer account, blog, article, search, contact, 404, password and gift card templates

## Structure
Standard Shopify theme folders (`assets`, `config`, `layout`, `locales`, `sections`, `snippets`, `templates`).

`store-presets/<store>/` holds per-store settings (`config/settings_data.json`, header/footer groups,
home page) that are uploaded on top of the base theme for that store. They are not part of the theme package.

## Deploy
With Shopify CLI:

```sh
shopify theme push --store <store>.myshopify.com --unpublished --theme "Heritage 4.99"
```

Then copy the matching files from `store-presets/<store>/` into the theme (or customise in the theme editor).
Or connect this repository in Shopify admin: Online Store > Themes > Add theme > Connect from GitHub.
