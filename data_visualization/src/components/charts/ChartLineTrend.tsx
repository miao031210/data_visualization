import { useMemo, useState } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { format, isValid, parseISO } from 'date-fns'
import {
  categoryAxisGrid,
  baseTheme,
  chartBorder,
  chartSplit,
  chartTextMuted,
  horizontalCategoryAxisLabel,
  tooltipLight,
} from '../../lib/chartTheme'
import { useDashboardStore } from '../../store/dashboardStore'

type Granularity = 'month' | 'week' | 'day'

const GRAN_OPTIONS: { key: Granularity; label: string }[] = [
  { key: 'month', label: '月' },
  { key: 'week', label: '周' },
  { key: 'day', label: '日' },
]

function parsePublishDate(raw: string | number | Date | undefined): Date | null {
  if (!raw) return null
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw
  if (typeof raw === 'number' && raw > 20000) {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000))
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof raw === 'string') {
    const cleaned = raw.trim()
    // try ISO
    let d = parseISO(cleaned)
    if (isValid(d)) return d
    // try common formats
    d = new Date(cleaned)
    if (isValid(d)) return d
    // try yyyy/MM/dd
    d = new Date(cleaned.replace(/\//g, '-'))
    if (isValid(d)) return d
  }
  return null
}

function granularityKey(d: Date, g: Granularity): string {
  if (g === 'month') return format(d, 'yyyy-MM')
  if (g === 'week') {
    // ISO week: year + '-W' + week number
    return format(d, "yyyy-'W'II")
  }
  return format(d, 'yyyy-MM-dd')
}

function granularityLabel(key: string, g: Granularity): string {
  if (g === 'month') return key // yyyy-MM
  if (g === 'week') return key // yyyy-Www
  return key.slice(5) // MM-dd
}

export function ChartLineTrend({ height = 280 }: { height?: number }) {
  const filteredData = useDashboardStore((s) => s.filteredData)
  const [gran, setGran] = useState<Granularity>('month')

  const option = useMemo((): EChartsOption => {
    if (!filteredData.length) {
      return { ...baseTheme }
    }

    const bucketMap: Record<string, { count: number; reads: number }> = {}
    filteredData.forEach((r) => {
      const d = parsePublishDate(r.publishTime ?? r.publishMonth)
      if (!d) {
        // fallback to publishMonth for month granularity
        if (gran === 'month' && r.publishMonth) {
          const key = String(r.publishMonth).trim()
          if (!bucketMap[key]) bucketMap[key] = { count: 0, reads: 0 }
          bucketMap[key].count++
          bucketMap[key].reads += r.reads
        }
        return
      }
      const key = granularityKey(d, gran)
      if (!bucketMap[key]) bucketMap[key] = { count: 0, reads: 0 }
      bucketMap[key].count++
      bucketMap[key].reads += r.reads
    })

    const keys = Object.keys(bucketMap).sort()
    const counts = keys.map((k) => bucketMap[k].count)
    const reads = keys.map((k) => bucketMap[k].reads)
    const labels = keys.map((k) => granularityLabel(k, gran))

    return {
      ...baseTheme,
      tooltip: {
        ...tooltipLight,
        trigger: 'axis',
      },
      legend: {
        data: ['发文量', '阅读量'],
        textStyle: { color: chartTextMuted },
        top: 0,
      },
      grid: categoryAxisGrid({ top: '18%', bottom: '22%' }),
      xAxis: {
        type: 'category',
        data: labels,
        axisLabel: {
          ...horizontalCategoryAxisLabel(gran === 'day' ? 8 : 14),
          rotate: gran === 'day' && labels.length > 20 ? 45 : 0,
        },
        axisLine: { lineStyle: { color: chartBorder } },
      },
      yAxis: [
        {
          type: 'value',
          name: '发文',
          nameTextStyle: { color: chartTextMuted },
          splitLine: { lineStyle: { color: chartSplit } },
          axisLabel: { color: chartTextMuted },
        },
        {
          type: 'value',
          name: '阅读',
          nameTextStyle: { color: chartTextMuted },
          axisLabel: { color: chartTextMuted },
          splitLine: { show: false },
        },
      ],
      series: [
        {
          name: '发文量',
          type: 'bar',
          data: counts,
          itemStyle: { color: 'rgba(79,142,247,0.45)' },
          barMaxWidth: gran === 'day' ? 12 : 30,
        },
        {
          name: '阅读量',
          type: 'line',
          yAxisIndex: 1,
          data: reads,
          smooth: true,
          lineStyle: { color: '#36d9a4', width: 2 },
          itemStyle: { color: '#36d9a4' },
          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,
              colorStops: [
                { offset: 0, color: 'rgba(54,217,164,0.25)' },
                { offset: 1, color: 'rgba(54,217,164,0)' },
              ],
            },
          },
        },
      ],
    }
  }, [filteredData, gran])

  return (
    <div className="min-w-0">
      <div className="mb-2 flex items-center gap-1">
        {GRAN_OPTIONS.map((g) => (
          <button
            key={g.key}
            type="button"
            onClick={() => setGran(g.key)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] transition-colors ${
              gran === g.key
                ? 'border-blue-400 bg-blue-50 text-blue-600'
                : 'border-slate-200 bg-white text-slate-400 hover:border-slate-300 hover:text-slate-600'
            }`}
          >
            {g.label}
          </button>
        ))}
      </div>
      <ReactECharts
        option={option}
        style={{ height }}
        className="w-full"
        notMerge
        lazyUpdate
      />
    </div>
  )
}
