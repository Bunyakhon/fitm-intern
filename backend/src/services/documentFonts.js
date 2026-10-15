const fs = require('node:fs');
const path = require('node:path');

// Self-contained HTML works in sandboxed Blob previews, offline downloads and
// Docker without host fonts or cross-origin font requests. Cache immutable assets.
let styles;
function documentFontStyles() {
  if (styles) return styles;
  styles = [['THSarabunNew.woff2', 400, 'normal'], ['THSarabunNew Bold.woff2', '500 900', 'normal'],
    ['THSarabunNew Italic.woff2', 400, 'italic'], ['THSarabunNew BoldItalic.woff2', '500 900', 'italic']]
    .map(([file, weight, style]) => {
      const bytes = fs.readFileSync(path.join(__dirname, '../assets/fonts/th-sarabun-new', file));
      return `@font-face{font-family:"TH Sarabun New";src:url(data:font/woff2;base64,${bytes.toString('base64')}) format("woff2");font-weight:${weight};font-style:${style};font-display:block}`;
    }).join('');
  return styles;
}
module.exports = { documentFontStyles };
