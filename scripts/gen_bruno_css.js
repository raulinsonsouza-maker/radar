const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const src = fs.readFileSync(path.join(ROOT, 'novo_layout', 'styles.css'), 'utf8')
const idx = src.indexOf('.radar-page {')
const chunk = src.slice(idx)

const header = `@import url("https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Inter:wght@400;500;600;700&display=swap");

.ui-bruno {
  --ink: #0b0c0b;
  --ink-2: #111311;
  --ink-3: #171917;
  --panel: #1a1c1a;
  --panel-soft: #20221f;
  --paper: #efeee9;
  --paper-2: #e7e6e0;
  --white: #fafaf7;
  --muted: #93978f;
  --muted-light: #b9bcb5;
  --line: rgba(255, 255, 255, 0.1);
  --line-dark: rgba(11, 12, 11, 0.14);
  --amber: #e7a957;
  --amber-bright: #ffb44c;
  --amber-soft: #f0c887;
  --green: #6bd39a;
  --red: #f5655b;
  --radius-sm: 8px;
  --radius-md: 14px;
  --radius-lg: 24px;
  --font-sans: "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --font-mono: "DM Mono", "SFMono-Regular", Consolas, monospace;
  min-height: 100vh;
  color: #eceee9;
  background:
    radial-gradient(circle at 58% 0, rgba(231, 169, 87, 0.045), transparent 28%),
    #0b0c0b;
  font-family: var(--font-sans);
  -webkit-font-smoothing: antialiased;
}

.ui-bruno *,
.ui-bruno *::before,
.ui-bruno *::after {
  box-sizing: border-box;
}

.ui-bruno .bruno-topbar {
  position: fixed;
  z-index: 50;
  top: 0;
  right: 0;
  left: 0;
  display: grid;
  grid-template-columns: 1fr auto 1fr;
  align-items: center;
  height: 68px;
  padding: 0 24px;
  background: rgba(11, 12, 11, 0.9);
  border-bottom: 1px solid rgba(255,255,255,0.09);
  backdrop-filter: blur(20px);
}

.ui-bruno .bruno-topbar__left {
  display: flex;
  align-items: center;
  gap: 30px;
}

.ui-bruno .bruno-brand {
  display: inline-flex;
  align-items: center;
  color: inherit;
  text-decoration: none;
  font-size: 14px;
  font-weight: 700;
  letter-spacing: -0.02em;
}

.ui-bruno .bruno-brand__mark {
  width: 28px;
  height: 28px;
  margin-right: 8px;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
}

.ui-bruno .bruno-brand__product {
  margin-left: 8px;
  padding-left: 8px;
  color: #969a92;
  font-weight: 500;
  border-left: 1px solid currentColor;
}

.ui-bruno .bruno-topbar__context {
  color: #686c64;
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ui-bruno .bruno-topbar__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

.ui-bruno .bruno-profile {
  display: flex;
  align-items: center;
  gap: 9px;
  margin-left: 8px;
  padding: 4px 7px 4px 4px;
  color: #d9dcd5;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 7px;
  cursor: pointer;
  font: inherit;
}

.ui-bruno .bruno-profile:hover {
  background: #181a17;
  border-color: var(--line);
}

.ui-bruno .bruno-profile > span {
  display: grid;
  width: 30px;
  height: 30px;
  place-items: center;
  color: var(--ink);
  background: #d0a567;
  border-radius: 7px;
  font-family: var(--font-mono);
  font-size: 8px;
}

.ui-bruno .bruno-profile > div {
  display: grid;
  gap: 2px;
  text-align: left;
}

.ui-bruno .bruno-profile b {
  font-size: 9px;
  font-weight: 500;
}

.ui-bruno .bruno-profile small {
  color: #666a62;
  font-size: 7px;
}

.ui-bruno .bruno-rail {
  position: fixed;
  z-index: 45;
  top: 68px;
  bottom: 0;
  left: 0;
  display: flex;
  width: 68px;
  flex-direction: column;
  justify-content: flex-start;
  padding: 22px 0;
  background: #0d0e0d;
  border-right: 1px solid rgba(255,255,255,0.08);
}

.ui-bruno .bruno-rail nav {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 11px;
}

.ui-bruno .bruno-rail a {
  position: relative;
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  color: #656961;
  border: 1px solid transparent;
  border-radius: 7px;
  text-decoration: none;
}

.ui-bruno .bruno-rail a:hover {
  color: #c7cac3;
  background: #171916;
}

.ui-bruno .bruno-rail a.bruno-rail__active {
  color: var(--amber-soft);
  background: rgba(231,169,87,0.09);
  border-color: rgba(231,169,87,0.2);
}

.ui-bruno .bruno-rail__active::before {
  position: absolute;
  top: 9px;
  bottom: 9px;
  left: -16px;
  width: 2px;
  background: var(--amber);
  border-radius: 0 2px 2px 0;
  content: "";
}

.ui-bruno .bruno-rail svg {
  width: 17px;
  height: 17px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.3;
}

.ui-bruno .bruno-outlet {
  padding: 68px 0 80px 68px;
  min-height: 100vh;
}

.bruno-layout-toggle {
  display: inline-flex;
  padding: 3px;
  background: #131512;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 7px;
  gap: 2px;
}

.bruno-layout-toggle button {
  min-height: 28px;
  padding: 0 12px;
  color: #7d8179;
  background: transparent;
  border: 0;
  border-radius: 5px;
  font-size: 10px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.bruno-layout-toggle button.is-on {
  color: #17140f;
  background: var(--amber, #e7a957);
}

.layout-toggle-light {
  background: #f0f0ec;
  border-color: rgba(11,12,11,0.12);
}

.layout-toggle-light button {
  color: #5a5e56;
}

.layout-toggle-light button.is-on {
  color: #17140f;
  background: #e7a957;
}
`

const skipRoots = [
  '.radar-page',
  '.app-header',
  '.app-search',
  '.icon-button',
  '.notification-button',
  '.profile-button',
  '.app-rail',
  '.app-main',
]

function prefixSelector(sel) {
  return sel
    .split(',')
    .map((part) => {
      const p = part.trim()
      if (p.startsWith('.ui-bruno')) return p
      return '.ui-bruno ' + p
    })
    .join(', ')
}

function shouldSkip(sel) {
  return sel.split(',').some((part) => {
    const p = part.trim()
    return skipRoots.some(
      (s) =>
        p === s ||
        p.startsWith(s + ' ') ||
        p.startsWith(s + '.') ||
        p.startsWith(s + ':') ||
        p.startsWith(s + '__') ||
        p.startsWith(s + '--'),
    )
  })
}

function processBlock(text) {
  const result = []
  let k = 0
  const m = text.length
  while (k < m) {
    while (k < m && ' \t\r\n'.includes(text[k])) k++
    if (k >= m) break
    if (text.startsWith('/*', k)) {
      const endc = text.indexOf('*/', k + 2)
      k = endc >= 0 ? endc + 2 : m
      continue
    }
    if (text.startsWith('@', k)) {
      const br = text.indexOf('{', k)
      if (br < 0) break
      let d = 0
      let jj = br
      while (jj < m) {
        if (text[jj] === '{') d++
        else if (text[jj] === '}') {
          d--
          if (d === 0) {
            jj++
            break
          }
        }
        jj++
      }
      result.push(text.slice(k, jj))
      k = jj
      continue
    }
    const br = text.indexOf('{', k)
    if (br < 0) break
    const sel = text.slice(k, br).trim()
    let d = 0
    let jj = br
    while (jj < m) {
      if (text[jj] === '{') d++
      else if (text[jj] === '}') {
        d--
        if (d === 0) {
          jj++
          break
        }
      }
      jj++
    }
    const body = text.slice(br, jj)
    if (!shouldSkip(sel)) result.push(prefixSelector(sel) + ' ' + body)
    k = jj
  }
  return result.join('\n')
}

const out = [header]
let i = 0
const n = chunk.length
while (i < n) {
  while (i < n && ' \t\r\n'.includes(chunk[i])) i++
  if (i >= n) break
  if (chunk.startsWith('/*', i)) {
    const end = chunk.indexOf('*/', i + 2)
    i = end >= 0 ? end + 2 : n
    continue
  }
  if (
    chunk.startsWith('@media', i) ||
    chunk.startsWith('@keyframes', i) ||
    chunk.startsWith('@supports', i)
  ) {
    const brace = chunk.indexOf('{', i)
    if (brace < 0) break
    const atHeader = chunk.slice(i, brace).trim()
    let depth = 0
    let j = brace
    while (j < n) {
      if (chunk[j] === '{') depth++
      else if (chunk[j] === '}') {
        depth--
        if (depth === 0) {
          j++
          break
        }
      }
      j++
    }
    const inner = chunk.slice(brace + 1, j - 1)
    out.push(atHeader + ' {\n' + processBlock(inner) + '\n}')
    i = j
    continue
  }
  const br = chunk.indexOf('{', i)
  if (br < 0) break
  const sel = chunk.slice(i, br).trim()
  let depth = 0
  let j = br
  while (j < n) {
    if (chunk[j] === '{') depth++
    else if (chunk[j] === '}') {
      depth--
      if (depth === 0) {
        j++
        break
      }
    }
    j++
  }
  const body = chunk.slice(br, j)
  if (!shouldSkip(sel)) out.push(prefixSelector(sel) + ' ' + body)
  i = j
}

out.push(`
.ui-bruno .prospectos-bruno {
  max-width: 1660px;
  margin: 0 auto;
}

.ui-bruno .bruno-row-detail td {
  height: auto;
  padding: 0 18px 16px;
  background: #0f110e;
}

.ui-bruno .bruno-row-detail__inner {
  display: grid;
  gap: 10px;
  padding: 12px 14px;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 8px;
  background: #141613;
  font-size: 11px;
  color: #b4b8af;
}

.ui-bruno .bruno-row-detail__inner a {
  color: var(--amber-soft);
}

.ui-bruno .bruno-row-detail__grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 10px;
}

.ui-bruno .bruno-row-detail__grid span {
  display: block;
  color: #6d7169;
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.ui-bruno .bruno-banner-error {
  max-width: 1592px;
  margin: 12px auto 0;
  padding: 12px 14px;
  color: #f5c2be;
  background: rgba(245,101,91,0.1);
  border: 1px solid rgba(245,101,91,0.25);
  border-radius: 8px;
  font-size: 12px;
}

.ui-bruno .filter-panel .multi-pick {
  margin-top: 10px;
}

.ui-bruno .filter-panel .multi-pick-label {
  color: #73776f;
  font-size: 8px;
}

.ui-bruno .filter-panel .multi-pick-box {
  background: #0b0c0b;
  border: 1px solid rgba(255,255,255,0.1);
  border-radius: 5px;
  min-height: 37px;
  padding: 4px 8px;
}

.ui-bruno .filter-panel .multi-pick-box input {
  color: #c7cac3;
  background: transparent;
  border: 0;
  font-size: 8px;
  width: 100%;
  outline: 0;
}

.ui-bruno .filter-panel .multi-chip {
  background: rgba(231,169,87,0.08);
  border: 1px solid rgba(231,169,87,0.25);
  color: var(--amber-soft);
  font-size: 8px;
}

.ui-bruno .filter-panel .multi-pick-menu {
  background: #171916;
  border: 1px solid rgba(255,255,255,0.12);
  z-index: 20;
}

.ui-bruno .filter-panel .multi-pick-option {
  color: #c7cac3;
}

.ui-bruno .filter-panel .multi-pick-option:hover {
  background: #20221f;
}

.ui-bruno .company-table tbody tr.is-expanded {
  background: rgba(231,169,87,0.035);
}

.ui-bruno .app-button:disabled {
  opacity: 0.55;
  cursor: default;
  transform: none;
}

@media (max-width: 900px) {
  .ui-bruno .bruno-rail {
    top: auto;
    right: 0;
    bottom: 0;
    z-index: 80;
    width: auto;
    height: 58px;
    flex-direction: row;
    align-items: center;
    padding: 0 16px;
    border-top: 1px solid rgba(255,255,255,0.1);
    border-right: 0;
  }
  .ui-bruno .bruno-rail nav { flex-direction: row; }
  .ui-bruno .bruno-rail__active::before {
    top: auto;
    right: 9px;
    bottom: -10px;
    left: 9px;
    width: auto;
    height: 2px;
  }
  .ui-bruno .bruno-outlet { padding: 62px 0 88px; }
  .ui-bruno .bruno-topbar { height: 62px; padding: 0 14px; }
  .ui-bruno .bruno-topbar__context { display: none; }
  .ui-bruno .bruno-profile > div { display: none; }
}
`)

const dest = path.join(ROOT, 'frontend', 'src', 'bruno.css')
fs.writeFileSync(dest, out.join('\n'), 'utf8')
console.log('wrote', dest, fs.statSync(dest).size, 'bytes')
