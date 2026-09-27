// Colours are CSS variables (css/app.css) so light / dark / high-contrast share one set of utilities.
const c = (v) => ({ opacityValue }) => (opacityValue === undefined || String(opacityValue).startsWith('var(') || Number(opacityValue) === 1 ? `var(--${v})` : `color-mix(in srgb, var(--${v}) ${Math.round(Number(opacityValue) * 100)}%, transparent)`);
module.exports = {
  content: ['./index.html', './js/**/*.js'],
  corePlugins: { preflight: false },   // reset lives in css/reset.css so components can override it
  theme: { extend: {
    colors: { bg: c('bg'), surface: c('surface'), raised: c('raised'), line: c('line'), ink: c('ink'), muted: c('muted'), accent: c('accent'), 'accent-soft': c('accent-soft'), 'on-accent': c('on-accent'), success: c('success'), warning: c('warning'), danger: c('danger') },
    fontFamily: { sans: ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Text"', '"Plus Jakarta Sans"', 'system-ui', 'sans-serif'], arabic: ['"Scheherazade New"', 'serif'] }
  } }
};
