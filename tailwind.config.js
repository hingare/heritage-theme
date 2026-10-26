/** Tailwind for Heritage. Utilities carry a `tw-` prefix and preflight is off,
 *  so they sit beside theme.css without overriding it. Colours and fonts read
 *  the CSS variables that snippets/css-variables.liquid writes from theme settings. */
module.exports = {
  prefix: 'tw-',
  content: [
    './layout/*.liquid',
    './sections/*.liquid',
    './snippets/*.liquid',
    './templates/**/*.liquid',
    './assets/features.js',
    './src/react/**/*.{js,jsx}'
  ],
  corePlugins: { preflight: false },
  theme: {
    extend: {
      colors: {
        body: 'var(--color-body-bg)',
        text: 'var(--color-body-text)',
        alt: 'var(--color-alt-bg)',
        line: 'var(--color-border)',
        primary: 'var(--color-primary)',
        'primary-text': 'var(--color-primary-text)',
        accent: 'var(--color-accent)',
        sale: 'var(--color-sale)'
      },
      fontFamily: {
        heading: 'var(--font-heading-family)',
        body: 'var(--font-body-family)'
      },
      borderRadius: {
        card: 'var(--card-radius)',
        btn: 'var(--button-radius)'
      },
      maxWidth: { page: 'var(--page-width)' },
      screens: { md: '750px', lg: '990px' },
      keyframes: {
        'tile-in': { from: { opacity: '0', transform: 'translateY(14px)' }, to: { opacity: '1', transform: 'none' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'none' } }
      },
      animation: {
        'tile-in': 'tile-in 0.5s cubic-bezier(0.2, 0.7, 0.2, 1) both',
        'fade-up': 'fade-up 0.4s ease-out both'
      }
    }
  }
};
