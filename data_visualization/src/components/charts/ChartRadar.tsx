import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { COLORS } from '../../constants/dashboard'
import {
  baseTheme,
  chartBorder,
  chartSplit,
  chartTextMuted,
  tooltipItemLight,
} from '../../lib/chartTheme'
import { useDashboardStore } from '../../store/dashboardStore'

/** 各账号四个比率（0～100），与 KPI 中在看率一致：Σ在看/Σ阅读；点赞率、分享率同理；原创率为原创篇数/总篇数 */
function accountRates(rows: { reads: number; sees: number; likes: number; shares: number; original: number }[]) {
  const n = rows.length
  if (!n) {
    return { seePct: 0, likePct: 0, sharePct: 0, origPct: 0 }
  }
  const reads = rows.reduce((s, r) => s + r.reads, 0)
  const origCount = rows.filter((r) => r.original === 1).length
  const origPct = (origCount / n) * 100
  if (!reads) {
    return { seePct: 0, likePct: 0, sharePct: 0, origPct }
  }
  const sees = rows.reduce((s, r) => s + r.sees, 0)
  const likes = rows.reduce((s, r) => s + r.likes, 0)
  const shares = rows.reduce((s, r) => s + r.shares, 0)
  return {
    seePct: (sees / reads) * 100,
    likePct: (likes / reads) * 100,
    sharePct: (shares / reads) * 100,
    origPct,
  }
}

const RADAR_LABELS = ['在看率', '点赞率', '分享率', '原创率'] as const

export function ChartRadar({ height = 280 }: { height?: number }) {
  const filteredData = useDashboardStore((s) => s.filteredData)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)

  const option = useMemo((): EChartsOption => {
    if (!filteredData.length) {
      return { ...baseTheme }
    }

    const accs = selectedAccount
      ? [selectedAccount]
      : [...new Set(filteredData.map((r) => r.account).filter(Boolean))].sort()

    const seriesData = accs.map((a, i) => {
      const rows = filteredData.filter((r) => r.account === a)
      const { seePct, likePct, sharePct, origPct } = accountRates(rows)
      const c = COLORS[i % COLORS.length]
      return {
        name: a,
        value: [seePct, likePct, sharePct, origPct],
        lineStyle: { color: c },
        itemStyle: { color: c },
        areaStyle: { color: `${c}30` },
      }
    })

    return {
      ...baseTheme,
      tooltip: {
        ...tooltipItemLight,
        formatter: (params: unknown) => {
          const p = params as {
            seriesName?: string
            name?: string
            value?: number[]
          }
          const name = p.seriesName ?? p.name ?? ''
          const v = p.value
          if (!Array.isArray(v) || v.length < 4) return name
          return `${name}<br/>${RADAR_LABELS[0]}：${v[0].toFixed(2)}%<br/>${RADAR_LABELS[1]}：${v[1].toFixed(2)}%<br/>${RADAR_LABELS[2]}：${v[2].toFixed(2)}%<br/>${RADAR_LABELS[3]}：${v[3].toFixed(2)}%`
        },
      },
      legend: {
        data: accs,
        textStyle: { color: chartTextMuted },
        bottom: 0,
      },
      radar: {
        indicator: RADAR_LABELS.map((n) => ({
          name: `${n}\n(%)`,
          max: 100,
        })),
        shape: 'polygon',
        splitNumber: 4,
        axisName: { color: chartTextMuted, fontSize: 11 },
        splitLine: { lineStyle: { color: chartSplit } },
        splitArea: {
          areaStyle: {
            color: ['rgba(148,163,184,0.06)', 'rgba(148,163,184,0.12)'],
          },
        },
        axisLine: { lineStyle: { color: chartBorder } },
        center: ['50%', '50%'],
        radius: '65%',
      },
      series: [{ type: 'radar', data: seriesData }],
    }
  }, [filteredData, selectedAccount])

  return (
    <ReactECharts
      option={option}
      style={{ height }}
      className="w-full"
      notMerge
      lazyUpdate
    />
  )
}
