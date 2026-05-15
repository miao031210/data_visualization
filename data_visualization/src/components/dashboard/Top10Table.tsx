import { useMemo, useState } from 'react'
import type { ArticleRow } from '../../types/article'
import { fmt } from '../../utils/format'
import { totalInteraction } from '../../utils/metrics'
import { publishSlotOrMissing } from '../../utils/publishSlot'
import { useDashboardStore } from '../../store/dashboardStore'

function normalizeArticleUrl(raw: unknown): string | null {
  if (raw == null) return null
  const s = String(raw).trim()
  if (!s) return null
  if (/^https?:\/\//i.test(s)) return s
  if (s.startsWith('//')) return `https:${s}`
  return `https://${s}`
}

function interactionRate(r: ArticleRow): number {
  if (!r.reads) return 0
  return totalInteraction(r) / r.reads
}

function interactionPer1k(r: ArticleRow): number {
  if (!r.reads) return 0
  return (totalInteraction(r) / r.reads) * 1000
}

type SortMode = 'reads' | 'interaction' | 'inter1k'

export function Top10Table() {
  const filteredData = useDashboardStore((s) => s.filteredData)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)
  const accountNames = useDashboardStore((s) => s.accountNames)
  const [sortMode, setSortMode] = useState<SortMode>('inter1k')

  const rows = useMemo(() => {
    if (!filteredData.length) return []
    const sorted = [...filteredData].sort((a, b) => {
      if (sortMode === 'reads') return b.reads - a.reads
      if (sortMode === 'inter1k') return interactionPer1k(b) - interactionPer1k(a)
      return interactionRate(b) - interactionRate(a)
    })
    return sorted.slice(0, 10)
  }, [filteredData, sortMode])

  const maxMetric = useMemo(() => {
    if (!rows.length) return 1
    if (sortMode === 'reads') return rows[0]?.reads || 1
    if (sortMode === 'inter1k') return Math.max(...rows.map((r) => interactionPer1k(r)), 1e-6)
    return Math.max(...rows.map((r) => interactionRate(r)), 1e-6)
  }, [rows, sortMode])

  const accountIndex = useMemo(() => {
    const m: Record<string, number> = {}
    accountNames.forEach((a, i) => {
      m[a] = i
    })
    return m
  }, [accountNames])

  const filterHint =
    selectedAccount === ''
      ? '当前：全部账号'
      : `当前公众号：${selectedAccount}`

  return (
    <div className="mb-3.5 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="font-medium text-slate-800">TOP 10 爆款文章排行</span>
          <span className="hidden text-slate-300 sm:inline" aria-hidden>
            |
          </span>
          <div className="flex items-center gap-1 text-[13px]">
            <button
              type="button"
              onClick={() => setSortMode('inter1k')}
              className={`rounded-md px-2 py-1 transition-colors ${
                sortMode === 'inter1k'
                  ? 'font-semibold text-blue-600 underline decoration-blue-200 underline-offset-4'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              千次互动
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setSortMode('reads')}
              className={`rounded-md px-2 py-1 transition-colors ${
                sortMode === 'reads'
                  ? 'font-semibold text-blue-600 underline decoration-blue-200 underline-offset-4'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              阅读量
            </button>
            <span className="text-slate-300">·</span>
            <button
              type="button"
              onClick={() => setSortMode('interaction')}
              className={`rounded-md px-2 py-1 transition-colors ${
                sortMode === 'interaction'
                  ? 'font-semibold text-blue-600 underline decoration-blue-200 underline-offset-4'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              互动率
            </button>
          </div>
        </div>
        <span className="text-[11px] text-slate-400">{filterHint}</span>
      </div>
      <p className="mb-3 text-[11px] text-slate-400">
        {sortMode === 'inter1k'
          ? '千次互动 = (点赞+分享+在看)/阅读×1000，消除阅读量基数影响，降序'
          : sortMode === 'reads'
            ? '按阅读量降序（可在顶栏切换公众号缩小范围）'
            : '互动率 = (点赞+分享+在看)/阅读，降序。阅读量<100时参考意义有限'}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[1080px] border-collapse text-xs">
          <thead>
            <tr className="border-b border-slate-200">
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                #
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                标题
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                文章链接
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                公众号
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                发布位置
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                发布时间
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                阅读数
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                千次互动
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                互动率
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                在看数
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                点赞数
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                分享数
              </th>
              <th className="whitespace-nowrap px-3 py-2 text-left font-medium text-slate-500">
                原创
              </th>
            </tr>
          </thead>
          <tbody>
            {!filteredData.length ? (
              <tr>
                <td colSpan={13}>
                  <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
                    <span className="text-3xl opacity-30">📊</span>
                    上传数据后显示排行
                  </div>
                </td>
              </tr>
            ) : (
              rows.map((r, i) => {
                const rankClass =
                  i === 0
                    ? 'text-amber-500'
                    : i === 1
                      ? 'text-slate-400'
                      : i === 2
                        ? 'text-amber-700'
                        : ''
                const tagIdx = accountIndex[r.account] ?? 0
                const pct =
                  sortMode === 'reads'
                    ? Math.min(100, (r.reads / maxMetric) * 100)
                    : sortMode === 'inter1k'
                      ? Math.min(100, (interactionPer1k(r) / maxMetric) * 100)
                      : Math.min(100, (interactionRate(r) / maxMetric) * 100)
                const title =
                  (r.title || '').length > 30
                    ? `${(r.title || '').slice(0, 30)}…`
                    : r.title || '—'
                const tagColors = [
                  'bg-blue-50 text-blue-700',
                  'bg-emerald-50 text-emerald-700',
                  'bg-orange-50 text-orange-700',
                ]
                const linkHref = normalizeArticleUrl(r.url)
                const ir = interactionRate(r)
                const ip1k = interactionPer1k(r)
                const lowReads = r.reads < 100
                return (
                  <tr
                    key={`${r.title}-${i}`}
                    className="border-b border-slate-100 transition-colors hover:bg-slate-50"
                  >
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`font-mono text-[13px] font-medium ${rankClass}`}
                      >
                        {i + 1}
                      </span>
                    </td>
                    <td className="max-w-[240px] truncate px-3 py-2 text-slate-800" title={r.title}>
                      {title}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      {linkHref ? (
                        <a
                          href={linkHref}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="font-medium text-blue-600 underline decoration-blue-200 underline-offset-2 hover:text-blue-800"
                        >
                          打开文章
                        </a>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2">
                      <span
                        className={`inline-block rounded px-2 py-0.5 text-[11px] ${tagColors[tagIdx % 3]}`}
                      >
                        {r.account || '—'}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {publishSlotOrMissing(r.position)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {String(r.publishMonth ?? r.publishTime ?? '—')}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-800">
                      <div className="flex items-center gap-2">
                        <div
                          className="h-1 min-w-1 rounded-sm bg-blue-500"
                          style={{ width: `${Math.max(4, pct * 0.8)}px` }}
                        />
                        {fmt(r.reads)}
                        {lowReads && (
                          <span
                            className="inline-block rounded bg-amber-100 px-1.5 py-0.5 text-[10px] text-amber-700"
                            title="阅读量不足100，互动率参考意义有限"
                          >
                            低阅读
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-slate-800">
                      {ip1k.toFixed(1)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 font-mono tabular-nums text-slate-800">
                      {(ir * 100).toFixed(2)}%
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {fmt(r.sees)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {fmt(r.likes)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-700">
                      {fmt(r.shares)}
                    </td>
                    <td className="whitespace-nowrap px-3 py-2 text-slate-600">
                      {r.original === 1 ? '✓' : '—'}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
