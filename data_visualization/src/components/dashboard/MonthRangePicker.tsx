import { useState, useRef, useEffect, useMemo } from 'react'

const MONTHS = ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月']

interface Props {
  months: string[]          // all available "YYYY-MM" strings
  start: string             // "YYYY-MM" or ""
  end: string               // "YYYY-MM" or ""
  onChange: (start: string, end: string) => void
}

export function MonthRangePicker({ months, start, end, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const [year, setYear] = useState(() => {
    // Default to the year of the latest available month
    if (months.length) {
      const latest = months[months.length - 1]
      return parseInt(latest.slice(0, 4), 10)
    }
    return new Date().getFullYear()
  })
  const [pending, setPending] = useState<'start' | 'end'>('start')
  const [localStart, setLocalStart] = useState(start)
  const [localEnd, setLocalEnd] = useState(end)
  const ref = useRef<HTMLDivElement>(null)

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Sync external state
  useEffect(() => {
    setLocalStart(start)
    setLocalEnd(end)
  }, [start, end])

  // Available years from data
  const years = useMemo(() => {
    const set = new Set<number>()
    for (const m of months) {
      set.add(parseInt(m.slice(0, 4), 10))
    }
    return [...set].sort((a, b) => a - b)
  }, [months])

  const yearMonths = useMemo(() => {
    return MONTHS.map((_, i) => {
      const m = `${year}-${String(i + 1).padStart(2, '0')}`
      const available = months.includes(m)
      return { label: MONTHS[i], value: m, available }
    })
  }, [year, months])

  const handleMonthClick = (value: string) => {
    if (pending === 'start') {
      setLocalStart(value)
      setLocalEnd('')
      setPending('end')
    } else {
      if (value < localStart) {
        // Clicked before start → reset
        setLocalStart(value)
        setLocalEnd('')
        setPending('end')
      } else {
        setLocalEnd(value)
        onChange(localStart, value)
        setPending('start')
        setOpen(false)
      }
    }
  }

  const displayText = localStart
    ? localEnd
      ? `${localStart} — ${localEnd}`
      : `${localStart} — 点击截止月`
    : '全部时间'

  const isInRange = (value: string) => {
    if (!localStart || !localEnd) return false
    return value >= localStart && value <= localEnd
  }

  const isEdge = (value: string) => value === localStart || value === localEnd

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs transition-colors ${
          localStart
            ? 'border-blue-300 bg-blue-50 text-blue-700'
            : 'border-slate-200 bg-white text-slate-500 hover:border-slate-300'
        }`}
      >
        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
        {displayText}
        {(localStart || localEnd) && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onChange('', '')
              setLocalStart('')
              setLocalEnd('')
              setPending('start')
            }}
            className="ml-0.5 text-blue-400 hover:text-red-500"
          >
            <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-60 rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
          {/* Year nav */}
          <div className="flex items-center justify-between mb-2">
            <button
              type="button"
              onClick={() => setYear((y) => Math.max(years[0] ?? y, y - 1))}
              disabled={year <= (years[0] ?? year)}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <span className="text-sm font-medium text-slate-700">{year}年</span>
            <button
              type="button"
              onClick={() => setYear((y) => Math.min(years[years.length - 1] ?? y, y + 1))}
              disabled={year >= (years[years.length - 1] ?? year)}
              className="text-slate-400 hover:text-slate-600 disabled:opacity-30"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Month grid */}
          <div className="grid grid-cols-4 gap-1">
            {yearMonths.map(({ label, value, available }) => {
              const inRange = isInRange(value)
              const edge = isEdge(value)
              return (
                <button
                  key={value}
                  type="button"
                  disabled={!available}
                  onClick={() => available && handleMonthClick(value)}
                  className={`rounded-lg py-1.5 text-[11px] font-medium transition-colors ${
                    edge
                      ? 'bg-blue-500 text-white shadow-sm'
                      : inRange
                        ? 'bg-blue-100 text-blue-700'
                        : available
                          ? 'text-slate-600 hover:bg-slate-100'
                          : 'text-slate-300 cursor-default'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>

          {/* Hint */}
          <p className="mt-2 text-[10px] text-slate-400 text-center">
            {pending === 'start' ? '点击选择起始月' : '点击选择截止月（或更早的月重选起始）'}
          </p>
        </div>
      )}
    </div>
  )
}
