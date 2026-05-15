import { useMemo, useState, useRef, useEffect } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'

export function TagBar() {
  const availableTags = useDashboardStore((s) => s.availableTags)
  const selectedTags = useDashboardStore((s) => s.selectedTags)
  const setSelectedTags = useDashboardStore((s) => s.setSelectedTags)
  const hasData = useDashboardStore((s) => s.hasData)

  const [searchText, setSearchText] = useState('')
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  // Match tags: substring match, case-insensitive
  const matchedTags = useMemo(() => {
    if (!searchText.trim()) return []
    const q = searchText.trim().toLowerCase()
    return availableTags
      .filter((t) => t.toLowerCase().includes(q))
      .sort((a, b) => {
        // Exact match first, then starts-with, then contains
        const aExact = a === q
        const bExact = b === q
        if (aExact !== bExact) return aExact ? -1 : 1
        const aStarts = a.startsWith(q)
        const bStarts = b.startsWith(q)
        if (aStarts !== bStarts) return aStarts ? -1 : 1
        return a.localeCompare(b, 'zh')
      })
  }, [availableTags, searchText])

  if (!hasData) return null

  const addTag = (tag: string) => {
    if (selectedTags.includes(tag)) return
    setSelectedTags([...selectedTags, tag])
    setSearchText('')
    setDropdownOpen(false)
    inputRef.current?.focus()
  }

  const removeTag = (tag: string) => {
    setSelectedTags(selectedTags.filter((t) => t !== tag))
  }

  const handleInputChange = (value: string) => {
    setSearchText(value)
    if (value.trim()) {
      setDropdownOpen(true)
    } else {
      setDropdownOpen(false)
    }
  }

  const handleInputFocus = () => {
    if (searchText.trim()) setDropdownOpen(true)
  }

  // Highlight matching part in tag text
  const highlightMatch = (tag: string) => {
    if (!searchText.trim()) return tag
    const q = searchText.trim()
    const idx = tag.toLowerCase().indexOf(q.toLowerCase())
    if (idx === -1) return tag
    const before = tag.slice(0, idx)
    const match = tag.slice(idx, idx + q.length)
    const after = tag.slice(idx + q.length)
    return (
      <>
        {before}
        <span className="text-blue-600 font-medium">{match}</span>
        {after}
      </>
    )
  }

  return (
    <div className="relative mb-3 rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-sm" ref={containerRef}>
      {/* Row 1: label + search input + clear */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-slate-500 shrink-0">病种/主题标签：</span>

        {/* Search input */}
        <div className="relative">
          <svg
            className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            ref={inputRef}
            type="text"
            value={searchText}
            onChange={(e) => handleInputChange(e.target.value)}
            onFocus={handleInputFocus}
            placeholder="搜索标签（如：肺癌、糖尿病…）"
            className="w-52 rounded-full border border-slate-200 py-1.5 pl-8 pr-8 text-xs text-slate-600 outline-none placeholder:text-slate-400 focus:border-blue-400"
          />
          {searchText && (
            <button
              type="button"
              onClick={() => {
                setSearchText('')
                setDropdownOpen(false)
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {selectedTags.length > 0 && (
          <button
            type="button"
            onClick={() => setSelectedTags([])}
            className="text-[11px] text-slate-400 hover:text-red-500 transition-colors shrink-0"
          >
            清除全部
          </button>
        )}
      </div>

      {/* Dropdown: sliding window with matched tags */}
      {dropdownOpen && matchedTags.length > 0 && (
        <div className="absolute z-20 mt-1 max-h-48 w-52 overflow-y-auto rounded-lg border border-slate-200 bg-white shadow-lg" style={{ left: '5.5rem' }}>
          {matchedTags.map((tag) => {
            const isSelected = selectedTags.includes(tag)
            return (
              <button
                key={tag}
                type="button"
                onClick={() => addTag(tag)}
                disabled={isSelected}
                className={`w-full px-3 py-1.5 text-left text-xs transition-colors ${
                  isSelected
                    ? 'bg-slate-50 text-slate-400 cursor-default'
                    : 'hover:bg-blue-50 text-slate-600 hover:text-blue-700'
                }`}
              >
                {highlightMatch(tag)}
                {isSelected && (
                  <span className="float-right text-[10px] text-slate-400">已选</span>
                )}
              </button>
            )
          })}
        </div>
      )}

      {/* Row 2: selected tags chips */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2">
          {selectedTags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 rounded-full border border-blue-300 bg-blue-50 px-2.5 py-1 text-[11px] leading-tight text-blue-700"
            >
              {tag}
              <button
                type="button"
                onClick={() => removeTag(tag)}
                className="text-blue-400 hover:text-red-500 transition-colors"
              >
                <svg className="h-3 w-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
