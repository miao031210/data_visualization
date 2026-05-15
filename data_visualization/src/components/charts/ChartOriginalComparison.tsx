import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { COLORS } from '../../constants/dashboard'
import {
  baseTheme,
  chartBorder,
  chartSplit,
  chartTextMuted,
  categoryAxisGrid,
  tooltipLight,
  noDataGraphic,
} from '../../lib/chartTheme'
import { fmt } from '../../utils/format'
import { useDashboardStore } from '../../store/dashboardStore'

const METRICS = [
  { key: 'reads' as const, label: '阅读数' },
  { key: 'sees' as const, label: '在看数' },
  { key: 'likes' as const, label: '点赞数' },
  { key: 'shares' as const, label: '分享数' },
]

export function ChartOriginalComparison({ height = 260 }: { height?: number }) {
  const filteredData = useDashboardStore((s) => s.filteredData)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)

  const option = useMemo((): EChartsOption => {
    if (!filteredData.length || !selectedAccount) {
      return { ...baseTheme, graphic: noDataGraphic() }
    }

    const accData = filteredData.filter((r) => r.account === selectedAccount)
    if (!accData.length) {
      return { ...baseTheme, graphic: noDataGraphic() }
    }

    const orig = accData.filter((r) => r.original === 1)
    const repr = accData.filter((r) => r.original !== 1)

    const origValues = METRICS.map((m) => orig.reduce((s, r) => s + r[m.key], 0))
    const reprValues = METRICS.map((m) => repr.reduce((s, r) => s + r[m.key], 0))

    return {
      ...baseTheme,
      tooltip: {
        ...tooltipLight,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params]
          const first = items[0] as { dataIndex?: number; name?: string }
          const idx = first.dataIndex ?? 0
          const metric = METRICS[idx]
          const oVal = origValues[idx] ?? 0
          const rVal = reprValues[idx] ?? 0
          const total = oVal + rVal
          const oPct = total ? ((oVal / total) * 100).toFixed(1) : '0.0'
          const rPct = total ? ((rVal / total) * 100).toFixed(1) : '0.0'
          return [
            `<strong>${metric.label}</strong>`,
            `原创：${fmt(oVal)} (${oPct}%)`,
            `转载：${fmt(rVal)} (${rPct}%)`,
            `合计：${fmt(total)}`,
          ].join('<br/>')
        },
      },
      legend: {
        data: ['原创', '转载'],
        textStyle: { color: chartTextMuted },
        top: 0,
      },
      grid: categoryAxisGrid({ top: '18%', bottom: '14%' }),
      xAxis: {
        type: 'category',
        data: METRICS.map((m) => m.label),
        axisLabel: { color: chartTextMuted, fontSize: 11 },
        axisLine: { lineStyle: { color: chartBorder } },
        boundaryGap: true,
      },
      yAxis: {
        type: 'log',
        min: 1,
        splitLine: { lineStyle: { color: chartSplit } },
        axisLabel: {
          color: chartTextMuted,
          formatter: (v: number) => (v >= 10000 ? `${(v / 10000).toFixed(0)}w` : v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)),
        },
        name: '对数刻度',
        nameTextStyle: { color: chartTextMuted, fontSize: 10 },
      },
      series: [
        {
          name: '原创',
          type: 'bar',
          stack: 'total',
          data: origValues,
          barMaxWidth: 44,
          barCategoryGap: '35%',
          itemStyle: { color: COLORS[0] },
          label: {
            show: true,
            position: 'inside',
            fontSize: 10,
            color: '#fff',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (p: any) => {
              const v = Number(p.value ?? 0)
              return v > 0 ? fmt(v) : ''
            },
          },
        },
        {
          name: '转载',
          type: 'bar',
          stack: 'total',
          data: reprValues,
          barMaxWidth: 44,
          barCategoryGap: '35%',
          itemStyle: { color: '#cbd5e1', borderRadius: [4, 4, 0, 0] },
          label: {
            show: true,
            position: 'inside',
            fontSize: 10,
            color: '#64748b',
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            formatter: (p: any) => {
              const v = Number(p.value ?? 0)
              return v > 0 ? fmt(v) : ''
            },
          },
        },
      ],
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
