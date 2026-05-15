import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'
import {
  prepareAnalysisData,
  runAIAnalysis,
} from '../../services/aiAnalysis'

type Status = 'idle' | 'loading' | 'done' | 'error'

export function AIAnalysisCard() {
  const allData = useDashboardStore((s) => s.allData)
  const filteredData = useDashboardStore((s) => s.filteredData)
  const comparisonData = useDashboardStore((s) => s.comparisonData)
  const selectedTags = useDashboardStore((s) => s.selectedTags)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)
  const hasData = useDashboardStore((s) => s.hasData)
  const accountNames = useDashboardStore((s) => s.accountNames)
  const aiContent = useDashboardStore((s) => s.aiContent)
  const setAIContent = useDashboardStore((s) => s.setAIContent)

  const cacheKey = selectedAccount + '|' + selectedTags.sort().join(',')

  const persistedContent = aiContent[cacheKey] ?? ''

  const [status, setStatus] = useState<Status>(persistedContent ? 'done' : 'idle')
  const [progress, setProgress] = useState(0)
  const [progressMsg, setProgressMsg] = useState('')
  const [content, setContent] = useState(persistedContent)
  const [error, setError] = useState('')
  const contentRef = useRef<HTMLDivElement>(null)

  const isAllAccounts = selectedAccount === ''

  const payload = useMemo(() => {
    if (!hasData) return null
    // 全部账号模式用 comparisonData（含标签筛选），单账号模式用 filteredData
    const sourceData = selectedAccount === '' ? comparisonData : filteredData
    return prepareAnalysisData(sourceData, filteredData, selectedAccount)
  }, [allData, filteredData, comparisonData, selectedAccount, hasData, selectedTags])

  // When switching accounts, restore persisted content or reset to idle
  useEffect(() => {
    const saved = aiContent[cacheKey] ?? ''
    if (saved) {
      setContent(saved)
      setStatus('done')
      setError('')
    } else {
      setStatus('idle')
      setProgress(0)
      setProgressMsg('')
      setContent('')
      setError('')
    }
  }, [cacheKey, aiContent])

  const handleAnalyze = useCallback(async () => {
    if (!payload) return
    setStatus('loading')
    setProgress(0)
    setContent('')
    setError('')

    try {
      await runAIAnalysis(
        payload,
        (p, msg) => {
          setProgress(p)
          setProgressMsg(msg)
        },
        (c) => {
          setContent(c)
          setStatus('done')
          setAIContent(cacheKey, c)
        },
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : '分析请求失败')
      setStatus('error')
    }
  }, [payload, cacheKey, setAIContent])

  // Scroll to top when new content arrives
  useEffect(() => {
    if (content && contentRef.current) {
      contentRef.current.scrollTop = 0
    }
  }, [content])

  const paragraphs = useMemo(
    () =>
      content
        .split('\n\n')
        .filter((p) => p.trim())
        .map((p) => p.replace(/^(第[一二三四五六七八九十]+段)[：:]\s*/u, '').trim()),
    [content],
  )

  /**
   * Parse and format a paragraph:
   * - 【...】 at paragraph start → subtitle
   * - **...** → bold text
   * - 「...」 → inline data highlight
   * - Auto-bold numbers & percentages as fallback
   */
  function renderFormattedText(text: string) {
    // Extract 【title】 prefix as subtitle
    let subtitle: string | null = null
    let body = text
    const bracketMatch = text.match(/^【([^】]+)】\s*/)
    if (bracketMatch) {
      subtitle = bracketMatch[1]
      body = text.slice(bracketMatch[0].length)
    }

    return {
      subtitle,
      body: formatBody(body),
    }
  }

  /** Format body text: **bold**, 「highlight」, auto-bold numbers */
  function formatBody(text: string) {
    // Split by **...**, 「...」, and number patterns
    const segments = text.split(
      /(\*\*[^*]+\*\*|「[^」]+」|\d{1,3}(?:,\d{3})*(?:\.\d+)?\s*(?:%|万|[万亿]|倍|篇|次|条|个|k|w)?)/g,
    )
    return segments.map((seg, i) => {
      if (!seg) return null
      // **bold** markers from model
      if (seg.startsWith('**') && seg.endsWith('**')) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {seg.slice(2, -2)}
          </strong>
        )
      }
      // 「highlight」markers from model
      if (seg.startsWith('「') && seg.endsWith('」')) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {seg.slice(1, -1)}
          </strong>
        )
      }
      // Numbers/percentages — auto-bold
      if (/^\d/.test(seg) && seg.trim().length > 0) {
        return (
          <strong key={i} className="font-semibold text-slate-900">
            {seg}
          </strong>
        )
      }
      return <span key={i}>{seg}</span>
    })
  }

  if (!hasData) {
    return (
      <section className="flex min-h-[160px] flex-col rounded-xl border border-dashed border-slate-200 bg-white p-5 shadow-sm">
        <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
          <p className="text-sm font-medium text-slate-500">智能分析</p>
          <p className="max-w-sm text-xs leading-relaxed text-slate-400">
            上传数据后，点击分析按钮即可查看大模型解读
          </p>
        </div>
      </section>
    )
  }

  return (
    <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm h-[500px]">
      {/* Header */}
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-5 py-3">
        <div className="flex items-center gap-3">
          <span className="text-lg" aria-hidden>
            🤖
          </span>
          <div>
            <h3 className="text-sm font-semibold text-slate-800">
              智能分析
              {isAllAccounts
                ? ` · 对比 ${accountNames.length} 个账号`
                : ` · ${selectedAccount}`}
            </h3>
            <p className="text-[11px] text-slate-400">
              {isAllAccounts
                ? `三账号综合对比分析${selectedTags.length > 0 ? ` · 标签：${selectedTags.join('、')}` : ''}`
                : `当前账号深度分析${selectedTags.length > 0 ? ` · 标签：${selectedTags.join('、')}` : ''}`}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={status === 'loading'}
          className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-xs font-semibold transition-all ${
            status === 'loading'
              ? 'cursor-not-allowed bg-slate-100 text-slate-400'
              : status === 'done'
                ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200'
                : 'bg-gradient-to-r from-blue-500 to-emerald-500 text-white hover:from-blue-600 hover:to-emerald-600 shadow-sm hover:shadow-md'
          }`}
        >
          {status === 'loading' ? (
            <>
              <svg
                className="h-3.5 w-3.5 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              分析中...
            </>
          ) : status === 'done' ? (
            '🔄 重新分析'
          ) : (
            '✨ 开始智能分析'
          )}
        </button>
      </div>

      {/* Content area — fixed height, scrollable */}
      <div
        ref={contentRef}
        className="flex-1 overflow-y-auto px-5 py-4 min-h-0"
      >
        {/* Loading state */}
        {status === 'loading' && (
          <div className="flex h-full items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <svg
                className="h-8 w-8 animate-spin text-blue-500"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <div className="flex gap-1">
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    className="h-1.5 w-1.5 animate-bounce rounded-full bg-blue-400"
                    style={{ animationDelay: `${i * 0.15}s` }}
                  />
                ))}
              </div>
              <span className="text-xs text-slate-400">
                大模型正在分析数据，请稍候...
              </span>
            </div>
          </div>
        )}

        {/* Results */}
        {status === 'done' && (
          paragraphs.length > 0 ? (
            <div className="space-y-4">
              {paragraphs.map((para, i) => {
                const { subtitle, body } = renderFormattedText(para.trim())
                return (
                  <div key={i} className="flex gap-3">
                    <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-emerald-100 text-[10px] font-bold text-blue-600">
                      {i + 1}
                    </span>
                    <div className="text-[13px] leading-relaxed text-slate-700 min-w-0">
                      {subtitle && (
                        <div className="text-sm font-semibold text-slate-900 mb-1">
                          {subtitle}
                        </div>
                      )}
                      <div>{body}</div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="flex h-full items-center justify-center">
              <div className="flex flex-col items-center gap-3">
                <div className="flex gap-1.5">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-2 w-2 animate-bounce rounded-full bg-blue-400"
                      style={{ animationDelay: `${i * 0.15}s` }}
                    />
                  ))}
                </div>
                <span className="text-xs text-slate-400">等待大模型返回结果...</span>
              </div>
            </div>
          )
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="flex h-full flex-col items-center justify-center gap-3">
            <span className="text-2xl" aria-hidden>
              ⚠️
            </span>
            <p className="text-sm text-red-600">{error}</p>
            <button
              type="button"
              onClick={handleAnalyze}
              className="rounded-lg border border-slate-200 bg-white px-4 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
            >
              重试
            </button>
          </div>
        )}

        {/* Idle state */}
        {status === 'idle' && (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <div className="flex gap-1.5">
              <div className="h-2 w-2 rounded-full bg-blue-300" />
              <div className="h-2 w-2 rounded-full bg-emerald-300" />
              <div className="h-2 w-2 rounded-full bg-blue-300" />
            </div>
            <p className="text-sm font-medium text-slate-600">
              准备好进行智能分析了
            </p>
            <p className="max-w-xs text-xs leading-relaxed text-slate-400">
              {isAllAccounts
                ? `将对「${accountNames.join('、')}」三个账号${selectedTags.length > 0 ? `中「${selectedTags.join('、')}」相关` : ''}进行对比分析，包括表现对比、头条效应、内容主题、互动趋势、最高互动文章和爆款规律`
                : `将对「${selectedAccount}」${selectedTags.length > 0 ? `中「${selectedTags.join('、')}」相关` : ''}进行深度分析，包括头条效应、内容主题、互动趋势、最高互动文章和爆款规律`}
            </p>
          </div>
        )}
      </div>
    </section>
  )
}
