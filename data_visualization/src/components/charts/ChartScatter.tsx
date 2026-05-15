import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { COLORS } from '../../constants/dashboard'
import {
  baseTheme,
  chartSplit,
  chartTextMuted,
  tooltipItemLight,
} from '../../lib/chartTheme'
import { totalInteraction } from '../../utils/metrics'
import type { ArticleRow } from '../../types/article'
import { useDashboardStore } from '../../store/dashboardStore'

const TOP_MARK = 8

function interactionRate(r: ArticleRow): number {
  if (!r.reads) return 0
  return totalInteraction(r) / r.reads
}

function shareRate(r: ArticleRow): number {
  if (!r.reads) return 0
  return r.shares / r.reads
}

export function ChartScatter({ height = 400 }: { height?: number }) {
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)
  const comparisonData = useDashboardStore((s) => s.comparisonData)
  const filteredData = useDashboardStore((s) => s.filteredData)
  const rows = selectedAccount ? filteredData : comparisonData

  const pack = useMemo(() => {
    const accs = [...new Set(rows.map((r) => r.account).filter(Boolean))].sort() as string[]
    const withReads = rows.filter((r) => r.reads > 0)

    let shareMin = Infinity
    let shareMax = 0
    for (const r of withReads) {
      shareMin = Math.min(shareMin, r.shares)
      shareMax = Math.max(shareMax, r.shares)
    }
    if (!Number.isFinite(shareMin)) shareMin = 0

    const series = accs.map((acc, ai) => {
      const accRows = withReads.filter((r) => r.account === acc)
      const ranked = [...accRows].sort(
        (a, b) => interactionRate(b) - interactionRate(a),
      )
      const topSet = new Set(
        ranked.slice(0, TOP_MARK).map((r) => `${r.title ?? ''}@@${r.account}`),
      )

      const data = accRows.map((r) => {
        const key = `${r.title ?? ''}@@${r.account}`
        const isTop = topSet.has(key)
        const sr = shareRate(r)
        const ir = interactionRate(r)
        const baseSize = Math.sqrt(Math.max(0, r.shares) || 0.25) * 3
        const symbolSize = isTop ? Math.max(baseSize * 1.35, 12) : Math.max(baseSize, 5)
        return {
          value: [r.reads, r.sees],
          symbolSize,
          title: r.title ?? '—',
          ir,
          sr,
          itemStyle: {
            color: COLORS[ai % COLORS.length],
            opacity: isTop ? 1 : 0.42,
          },
        }
      })

      return { name: acc, type: 'scatter' as const, data, color: COLORS[ai % COLORS.length] }
    })

    return {
      accs,
      series,
      shareMin,
      shareMax,
    }
  }, [rows])

  const option = useMemo((): EChartsOption => {
    return {
      ...baseTheme,
      tooltip: {
        ...tooltipItemLight,
        formatter: (p: unknown) => {
          const param = p as {
            seriesName?: string
            data?: {
              title?: string
              ir?: number
              sr?: number
              value?: number[]
            }
          }
          const d = param.data
          const v = d?.value
          if (!Array.isArray(v) || v.length < 2 || !d) return ''
          const title = d.title ?? ''
          return `${param.seriesName}<br/>${String(title).slice(0, 80)}${String(title).length > 80 ? '…' : ''}<br/>阅读 ${v[0]} · 在看 ${v[1]}<br/>互动率 ${((d.ir ?? 0) * 100).toFixed(2)}% · 分享率 ${((d.sr ?? 0) * 100).toFixed(2)}%`
        },
      },
      legend: {
        type: 'scroll',
        data: pack.accs,
        textStyle: { color: chartTextMuted, fontSize: 10 },
        bottom: 0,
      },
      grid: {
        left: '10%',
        right: '6%',
        top: '8%',
        bottom: pack.accs.length > 1 ? '16%' : '12%',
        containLabel: true,
      },
      xAxis: {
        type: 'value',
        name: '阅读',
        nameLocation: 'middle',
        nameGap: 28,
        scale: true,
        splitLine: { lineStyle: { color: chartSplit } },
        axisLabel: { color: chartTextMuted, fontSize: 11 },
        nameTextStyle: { color: chartTextMuted, fontSize: 11 },
      },
      yAxis: {
        type: 'value',
        name: '在看',
        nameLocation: 'middle',
        nameGap: 36,
        scale: true,
        splitLine: { lineStyle: { color: chartSplit } },
        axisLabel: { color: chartTextMuted, fontSize: 11 },
        nameTextStyle: { color: chartTextMuted, fontSize: 11 },
      },
      series: pack.series,
    }
  }, [pack])

  if (!rows.length) {
    return <div className="text-center text-sm text-slate-400">上传数据后显示</div>
  }

  return (
    <div className="min-w-0 space-y-3">
      <ReactECharts
        option={option}
        style={{ height }}
        className="w-full min-w-0"
        notMerge
        lazyUpdate
      />
      <p className="text-[10px] leading-relaxed text-slate-400">
        多账号时同色气泡为一号线；气泡大小 ∝ √分享数（分享数范围：{pack.shareMin}～
        {pack.shareMax}）。加大、高不透明点为该号互动率 Top {TOP_MARK}（阅读&gt;0）。
      </p>
    </div>
  )
}
