import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { COLORS } from '../../constants/dashboard'
import { baseTheme, chartTextMuted, tooltipItemLight } from '../../lib/chartTheme'
import { useDashboardStore } from '../../store/dashboardStore'

export function ChartPieOriginal({ height = 280 }: { height?: number }) {
  const filteredData = useDashboardStore((s) => s.filteredData)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)

  const option = useMemo((): EChartsOption => {
    if (!filteredData.length) {
      return { ...baseTheme }
    }

    const accs = selectedAccount
      ? [selectedAccount]
      : [...new Set(filteredData.map((r) => r.account).filter(Boolean))].sort().slice(0, 3)
    const totalCols = accs.length
    const centers: [string, string][] =
      totalCols === 1
        ? [['50%', '50%']]
        : totalCols === 2
          ? [
              ['28%', '50%'],
              ['72%', '50%'],
            ]
          : [
              ['20%', '50%'],
              ['50%', '50%'],
              ['80%', '50%'],
            ]
    const radius = totalCols <= 2 ? '55%' : '45%'

    const series = accs.map((a, i) => {
      const rows = filteredData.filter((r) => r.account === a)
      const orig = rows.filter((r) => r.original === 1).length
      const repr = rows.length - orig
      const base = COLORS[i % COLORS.length]
      return {
        name: a,
        type: 'pie' as const,
        center: centers[i],
        radius: ['35%', radius],
        label: {
          color: chartTextMuted,
          fontSize: 11,
          formatter: '{b}\n{d}%',
        },
        labelLine: { lineStyle: { color: '#cbd5e1' } },
        data: [
          { value: orig, name: '原创', itemStyle: { color: base } },
          {
            value: repr,
            name: '转载',
            itemStyle: { color: `${base}66` },
          },
        ],
      }
    })

    const graphics = accs.map((a, i) => ({
      type: 'text' as const,
      left: centers[i][0],
      bottom: 18,
      style: {
        text: a,
        fill: chartTextMuted,
        fontSize: 11,
        textAlign: 'center' as const,
      },
      z: 100,
    }))

    return {
      ...baseTheme,
      tooltip: tooltipItemLight,
      series,
      graphic: graphics,
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
