import { useEffect, useMemo, useState } from 'react'

export function MultiPick({
  label,
  placeholder,
  selected,
  options,
  onChange,
  disabled,
  loadOptions,
  resolveLabel,
}: {
  label: string
  placeholder: string
  selected: string[]
  options: { value: string; label: string; hint?: string }[]
  onChange: (next: string[]) => void
  disabled?: boolean
  loadOptions?: (query: string) => Promise<{ value: string; label: string; hint?: string }[]>
  resolveLabel?: (value: string) => string
}) {
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [loadingOpts, setLoadingOpts] = useState(false)
  const [asyncOptions, setAsyncOptions] = useState<
    { value: string; label: string; hint?: string }[]
  >([])
  const [labelMap, setLabelMap] = useState<Record<string, string>>({})

  useEffect(() => {
    if (!loadOptions) return
    const term = query.trim()
    if (term.length < 2) {
      setAsyncOptions([])
      setLoadingOpts(false)
      return
    }
    let cancelled = false
    setLoadingOpts(true)
    const timer = window.setTimeout(() => {
      void loadOptions(term)
        .then((rows) => {
          if (cancelled) return
          setAsyncOptions(rows)
          setLabelMap((prev) => {
            const next = { ...prev }
            for (const row of rows) next[row.value] = row.label
            return next
          })
        })
        .catch(() => {
          if (!cancelled) setAsyncOptions([])
        })
        .finally(() => {
          if (!cancelled) setLoadingOpts(false)
        })
    }, 250)
    return () => {
      cancelled = true
      window.clearTimeout(timer)
    }
  }, [query, loadOptions])

  const filtered = useMemo(() => {
    if (loadOptions) {
      return asyncOptions.filter((o) => !selected.includes(o.value))
    }
    const q = query.trim().toLowerCase()
    const base = options.filter((o) => !selected.includes(o.value))
    if (!q) return base.slice(0, 40)
    return base
      .filter(
        (o) =>
          o.label.toLowerCase().includes(q) ||
          o.value.toLowerCase().includes(q) ||
          (o.hint || '').toLowerCase().includes(q),
      )
      .slice(0, 40)
  }, [options, query, selected, loadOptions, asyncOptions])

  const selectedLabels = useMemo(() => {
    const map = new Map(options.map((o) => [o.value, o.label]))
    return selected.map((v) => ({
      value: v,
      label: map.get(v) || labelMap[v] || resolveLabel?.(v) || v,
    }))
  }, [options, selected, labelMap, resolveLabel])

  const showMenu =
    !disabled &&
    open &&
    (loadOptions ? query.trim().length >= 2 : query.trim().length > 0)

  function pick(option: { value: string; label: string }) {
    onChange([...selected, option.value])
    setLabelMap((prev) => ({ ...prev, [option.value]: option.label }))
    setQuery('')
    setAsyncOptions([])
    setOpen(false)
  }

  return (
    <div className={`multi-pick ${disabled ? 'disabled' : ''}`}>
      <span className="multi-pick-label">{label}</span>
      <div className="multi-pick-box">
        {selectedLabels.length > 0 && (
          <div className="multi-pick-chips">
            {selectedLabels.map((item) => (
              <button
                key={item.value}
                type="button"
                className="multi-chip"
                onClick={() => onChange(selected.filter((v) => v !== item.value))}
                disabled={disabled}
              >
                {item.label}
                <span aria-hidden>×</span>
              </button>
            ))}
          </div>
        )}
        <input
          placeholder={placeholder}
          value={query}
          disabled={disabled}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => {
            window.setTimeout(() => setOpen(false), 150)
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              if (filtered[0]) pick(filtered[0])
            }
            if (e.key === 'Backspace' && !query && selected.length) {
              onChange(selected.slice(0, -1))
            }
          }}
        />
      </div>
      {showMenu && (
        <div className="multi-pick-menu">
          {loadingOpts && <div className="multi-pick-empty">Buscando…</div>}
          {!loadingOpts && filtered.length === 0 && (
            <div className="multi-pick-empty">Nenhum resultado</div>
          )}
          {!loadingOpts &&
            filtered.map((o) => (
              <button
                key={o.value}
                type="button"
                className="multi-pick-option"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(o)}
              >
                <strong>{o.label}</strong>
                {o.hint ? <span>{o.hint}</span> : null}
              </button>
            ))}
        </div>
      )}
    </div>
  )
}
