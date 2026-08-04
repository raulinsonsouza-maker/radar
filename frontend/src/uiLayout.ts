export type UiLayout = 'atual' | 'bruno'

const LAYOUT_KEY = 'symbius-ui-layout-v2'

export function loadUiLayout(): UiLayout {
  try {
    const q = new URLSearchParams(window.location.search).get('layout')
    if (q === 'atual' || q === 'bruno') return q
    const saved = localStorage.getItem(LAYOUT_KEY)
    if (saved === 'atual' || saved === 'bruno') return saved
  } catch {
    /* ignore */
  }
  return 'bruno'
}

export function saveUiLayout(layout: UiLayout) {
  try {
    localStorage.setItem(LAYOUT_KEY, layout)
  } catch {
    /* ignore */
  }
}

export function syncUiLayoutQuery(layout: UiLayout) {
  try {
    const url = new URL(window.location.href)
    url.searchParams.set('layout', layout)
    window.history.replaceState({}, '', url.toString())
  } catch {
    /* ignore */
  }
}
