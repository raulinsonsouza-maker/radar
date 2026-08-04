const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')
const src = fs.readFileSync(path.join(ROOT, 'novo_layout', 'styles.css'), 'utf8')
const end = src.indexOf('.radar-page {')
const chunk = src.slice(0, end)

const skipExact = new Set(['*', 'html', 'a', 'button', 'input', 'select', 'button,\na', 'button,\r\na'])

function prefixSelector(sel) {
  return sel
    .split(',')
    .map((part) => {
      let p = part.trim()
      if (!p) return p
      if (p === 'body' || p === 'body.landing-page' || p === '.landing-page') {
        return '.lp-bruno'
      }
      if (p.startsWith('body ')) {
        return '.lp-bruno ' + p.slice(5)
      }
      if (p.startsWith('.lp-bruno')) return p
      if (p === '*' || p.startsWith('*')) {
        return '.lp-bruno ' + p
      }
      if (p === 'html') return '.lp-bruno'
      if (p === 'a' || p === 'button' || p === 'input' || p === 'select') {
        return '.lp-bruno ' + p
      }
      return '.lp-bruno ' + p
    })
    .join(', ')
}

function shouldSkip(sel) {
  const t = sel.trim()
  if (t === '*' || t === 'html') return false
  return false
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
    if (text.startsWith('@import', k)) {
      // URLs contain ';' (e.g. font weights) — find closing quote then semicolon
      const q1 = text.indexOf('"', k)
      const q2 = q1 >= 0 ? text.indexOf('"', q1 + 1) : -1
      const semi = q2 >= 0 ? text.indexOf(';', q2) : text.indexOf(';', k)
      // Skip original imports; we inject a clean one at the top
      k = semi >= 0 ? semi + 1 : m
      continue
    }
    if (text.startsWith('@', k)) {
      const brace = text.indexOf('{', k)
      if (brace < 0) break
      const header = text.slice(k, brace).trim()
      let d = 0
      let jj = brace
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
      const inner = text.slice(brace + 1, jj - 1)
      if (header.startsWith('@keyframes') || header.startsWith('@font-face')) {
        result.push(text.slice(k, jj))
      } else {
        result.push(header + ' {\n' + processBlock(inner) + '\n}')
      }
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
    if (!shouldSkip(sel) && sel !== ':root') {
      // Keep :root vars under .lp-bruno
      result.push(prefixSelector(sel) + ' ' + body)
    } else if (sel === ':root') {
      result.push('.lp-bruno ' + body)
    }
    k = jj
  }
  return result.join('\n')
}

const out = [
  '@import url("https://fonts.googleapis.com/css2?family=DM+Mono:wght@300;400;500&family=Inter:wght@400;500;600;700&display=swap");',
  '',
  processBlock(chunk),
  `
.lp-bruno {
  min-height: 100vh;
  color: var(--ink, #0b0c0b);
  background: var(--paper, #efeee9);
  font-family: var(--font-sans, Inter, sans-serif);
  -webkit-font-smoothing: antialiased;
}

.lp-bruno a {
  color: inherit;
  text-decoration: none;
}

.lp-bruno button,
.lp-bruno input,
.lp-bruno select {
  font: inherit;
}

.lp-bruno .lp-layout-toggle {
  position: fixed;
  z-index: 80;
  right: 18px;
  bottom: 18px;
  display: inline-flex;
  padding: 3px;
  background: #131512;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 8px;
  gap: 2px;
  box-shadow: 0 12px 40px rgba(0,0,0,0.28);
}

.lp-bruno .lp-layout-toggle button,
.lp .lp-layout-toggle button {
  min-height: 32px;
  padding: 0 12px;
  color: #9aa094;
  background: transparent;
  border: 0;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  font-family: inherit;
}

.lp-bruno .lp-layout-toggle button.is-on,
.lp .lp-layout-toggle button.is-on {
  color: #17140f;
  background: #e7a957;
}

.lp .lp-layout-toggle {
  position: fixed;
  z-index: 80;
  right: 18px;
  bottom: 18px;
  display: inline-flex;
  padding: 3px;
  background: #1a1a18;
  border: 1px solid rgba(255,255,255,0.14);
  border-radius: 8px;
  gap: 2px;
}
`,
]

const dest = path.join(ROOT, 'frontend', 'src', 'bruno-landing.css')
fs.writeFileSync(dest, out.join('\n'), 'utf8')
console.log('wrote', dest, fs.statSync(dest).size)
