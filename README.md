# Heritage 4.99

An original Shopify Online Store 2.0 theme that combines the layout and feature set of Impulse
with the editorial sections of Prestige. Written from scratch; it contains no code from
Archetype Themes' Impulse or Maestrooo's Prestige.

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
- Collection page: storefront filters (Search & Discovery), sorting, grid-size toggle, AJAX updates, mobile filter drawer,
  page numbers, a "Load more" button or infinite scroll
- Color schemes (Theme settings > Color schemes) picked per section, and a transparent header over the homepage hero
- Cart drawer with free-shipping progress bar, order notes, terms checkbox; full cart page
- Customer account, blog, article, search, contact, 404, password and gift card templates
- Prestige-style sections: image banner with scroll zoom/parallax, shop the look (product hotspots),
  before/after slider, timeline, video with text, text with icons, comparison table, FAQ (with FAQPage JSON-LD),
  countdown timer
- Wishlist (browser-saved, header count, wishlist page template `page.wishlist`), recently viewed products
- Product page extras: wishlist button, size chart drawer, store pickup availability, estimated delivery date,
  "Pairs well with" (Search & Discovery complementary products), countdown
- Newsletter popup (footer group), cart drawer upsell, back-to-top button
- React islands: live header search (suggestions, recent and popular searches, keyboard control),
  collection tabs that switch without reloading, and a gift finder quiz that ranks products by tag

## Structure
Standard Shopify theme folders (`assets`, `config`, `layout`, `locales`, `sections`, `snippets`, `templates`).

`store-presets/<store>/` holds per-store settings (`config/settings_data.json`, header/footer groups,
home page) that are uploaded on top of the base theme for that store. They are not part of the theme package.

## Languages and tooling
Liquid, HTML, CSS, Tailwind CSS, JavaScript, React, JSON and JSON-LD.

- Tailwind CSS is compiled at build time: utilities use the `tw-` prefix and preflight is off, so they
  sit beside `assets/theme.css`. Colours and fonts in `tailwind.config.js` read the CSS variables set from theme settings.
- React 18 powers a few "islands" (`src/react/`), bundled by esbuild into `assets/react-islands.js`.
  Liquid renders each island with its props as JSON and plain HTML that shows until React loads.
  `assets/features.js` loads the bundle only on pages that have an island, as it nears the viewport
  (or, for search, when the shopper reaches for the search icon), so other pages stay light.
- Next.js is not used: Shopify themes run on Liquid. A Next.js storefront would be a separate headless
  site (Hydrogen/Storefront API) with its own hosting.

```sh
npm install
npm run build       # React islands + Tailwind -> assets/ (commit the output)
```

`package.json`, `tailwind.config.js` and `src/` are build files only and are excluded by `.shopifyignore`.

## Deploy
With Shopify CLI:

```sh
shopify theme push --store <store>.myshopify.com --unpublished --theme "Heritage 4.99"
```

Then copy the matching files from `store-presets/<store>/` into the theme (or customise in the theme editor).
Or connect this repository in Shopify admin: Online Store > Themes > Add theme > Connect from GitHub.
