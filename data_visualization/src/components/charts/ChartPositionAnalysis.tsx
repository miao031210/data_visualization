import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import { COLORS } from '../../constants/dashboard'
import {
  categoryAxisGrid,
  baseTheme,
  chartBorder,
  chartSplit,
  chartTextMuted,
  horizontalCategoryAxisLabel,
  noDataGraphic,
  tooltipLight,
  tooltipItemLight,
} from '../../lib/chartTheme'
import { totalInteraction } from '../../utils/metrics'
import type { SlotOrMissing } from '../../utils/publishSlot'
import { publishSlotOrMissing } from '../../utils/publishSlot'
import { useDashboardStore } from '../../store/dashboardStore'

const SLOTS_ORDER: SlotOrMissing[] = ['头条', '次条', '第三条', '第四条', '其他', '未标注']

export function ChartPositionAnalysis({
  pieHeight = 220,
  barHeight = 260,
}: {
  pieHeight?: number
  barHeight?: number
}) {
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)
  const comparisonData = useDashboardStore((s) => s.comparisonData)
  const filteredData = useDashboardStore((s) => s.filteredData)
  const rows = selectedAccount ? filteredData : comparisonData

  const pack = useMemo(() => {
    const accs = [...new Set(rows.map((r) => r.account).filter(Boolean))].sort() as string[]
    const rawMissing = rows.filter(
      (r) => r.position == null || !String(r.position).trim(),
    ).length
    const slotOf = (r: (typeof rows)[0]) => publishSlotOrMissing(r.position)

    const countByAccSlot: Record<string, Record<string, number>> = {}
    const sumReadsByAccSlot: Record<string, Record<string, number>> = {}

    for (const a of accs) {
      countByAccSlot[a] = {}
      sumReadsByAccSlot[a] = {}
      for (const sl of SLOTS_ORDER) {
        countByAccSlot[a][sl] = 0
        sumReadsByAccSlot[a][sl] = 0
      }
    }

    for (const r of rows) {
      const a = r.account || '—'
      const sl = slotOf(r)
      if (!countByAccSlot[a]) continue
      countByAccSlot[a][sl] = (countByAccSlot[a][sl] ?? 0) + 1
      sumReadsByAccSlot[a][sl] = (sumReadsByAccSlot[a][sl] ?? 0) + r.reads
    }

    const avgReadsByAccSlot: Record<string, Record<string, number>> = {}
    for (const a of accs) {
      avgReadsByAccSlot[a] = {}
      for (const sl of SLOTS_ORDER) {
        const n = countByAccSlot[a][sl] ?? 0
        const sumR = sumReadsByAccSlot[a][sl] ?? 0
        avgReadsByAccSlot[a][sl] = n ? Math.round(sumR / n) : 0
      }
    }

    const slotsForChart = SLOTS_ORDER.filter((sl) =>
      rows.some((r) => slotOf(r) === sl),
    )

    const warnNoPosition =
      rawMissing === rows.length && rows.length > 0

    return {
      accs,
      slotsForChart,
      avgReadsByAccSlot,
      countByAccSlot,
      slotOf,
      warnNoPosition,
      rawMissingRatio: rows.length ? rawMissing / rows.length : 0,
    }
  }, [rows])

  const pieOptions = useMemo(() => {
    return pack.accs.map((a): EChartsOption => {
      const slotOf = pack.slotOf
      const parts = pack.slotsForChart
        .map((sl) => {
          const c =
            rows.filter((r) => r.account === a && slotOf(r) === sl).length
          return { value: c, name: sl }
        })
        .filter((x) => x.value > 0)

      if (!parts.length) {
        return { ...baseTheme, graphic: noDataGraphic() }
      }

      const palette = ['#4f8ef7', '#36d9a4', '#f7d44f', '#c97af5', '#cbd5e1', '#f7884f']
      return {
        ...baseTheme,
        title: {
          text: a,
          left: 'center',
          top: 6,
          textStyle: { fontSize: 11, color: chartTextMuted, fontWeight: 600 },
        },
        tooltip: tooltipItemLight,
        series: [
          {
            type: 'pie',
            radius: ['38%', '62%'],
            center: ['50%', '54%'],
            avoidLabelOverlap: true,
            label: {
              formatter: '{b}\n{d}%',
              fontSize: 10,
              color: chartTextMuted,
            },
            labelLine: { lineStyle: { color: '#cbd5e1' } },
            data: parts.map((p, i) => ({
              ...p,
              itemStyle: { color: palette[i % palette.length] },
            })),
          },
        ],
      }
    })
  }, [pack, rows])

  const barAvgReadsOption = useMemo((): EChartsOption => {
    if (!rows.length || !pack.slotsForChart.length) {
      return { ...baseTheme, graphic: noDataGraphic() }
    }
    const series = pack.accs.map((a, i) => ({
      name: a,
      type: 'bar' as const,
      data: pack.slotsForChart.map((sl) => pack.avgReadsByAccSlot[a]?.[sl] ?? 0),
      itemStyle: { color: COLORS[i % COLORS.length] },
      barMaxWidth: 16,
    }))
    return {
      ...baseTheme,
      tooltip: { ...tooltipLight, trigger: 'axis', axisPointer: { type: 'shadow' } },
      legend: {
        data: pack.accs,
        textStyle: { color: chartTextMuted, fontSize: 10 },
        type: 'scroll',
        top: 0,
      },
      grid: categoryAxisGrid({ top: '20%', bottom: '22%' }),
      xAxis: {
        type: 'category',
        data: pack.slotsForChart,
        axisLabel: horizontalCategoryAxisLabel(11),
        axisLine: { lineStyle: { color: chartBorder } },
      },
      yAxis: {
        type: 'value',
        name: '篇均阅读',
        nameTextStyle: { color: chartTextMuted, fontSize: 10 },
        splitLine: { lineStyle: { color: chartSplit } },
        axisLabel: { color: chartTextMuted },
      },
      series,
    }
  }, [rows, pack])

  const barAirOption = useMemo((): EChartsOption => {
    if (!rows.length || !pack.slotsForChart.length) {
      return { ...baseTheme }
    }
    const slotOf = pack.slotOf
    const series = pack.accs.map((a, i) => ({
      name: a,
      type: 'bar' as const,
      data: pack.slotsForChart.map((sl) => {
        const subset = rows.filter(
          (r) => r.account === a && slotOf(r) === sl,
        )
        if (!subset.length) return 0
        const reads = subset.reduce((s, r) => s + r.reads, 0)
        if (!reads) return 0
        const inter = subset.reduce((s, r) => s + totalInteraction(r), 0)
        return Number(((inter / reads) * 1000).toFixed(1))
      }),
      itemStyle: { color: COLORS[i % COLORS.length] },
      barMaxWidth: 16,
    }))
    return {
      ...baseTheme,
      tooltip: {
        ...tooltipLight,
        trigger: 'axis',
        valueFormatter: (v: unknown) =>
          typeof v === 'number' ? `${v.toFixed(1)} 次/千读` : String(v),
      },
      legend: {
        data: pack.accs,
        textStyle: { color: chartTextMuted, fontSize: 10 },
        type: 'scroll',
        top: 0,
      },
      grid: categoryAxisGrid({ top: '20%', bottom: '22%' }),
      xAxis: {
        type: 'category',
        data: pack.slotsForChart,
        axisLabel: horizontalCategoryAxisLabel(11),
        axisLine: { lineStyle: { color: chartBorder } },
      },
      yAxis: {
        type: 'value',
        name: '千次阅读互动数',
        nameTextStyle: { color: chartTextMuted, fontSize: 10 },
        splitLine: { lineStyle: { color: chartSplit } },
        axisLabel: { color: chartTextMuted },
      },
      series,
    }
  }, [rows, pack])

  if (!rows.length) {
    return <div className="text-center text-sm text-slate-400">上传数据后显示</div>
  }

  return (
    <div className="min-w-0 space-y-6">
      {pack.warnNoPosition ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
          当前数据中「发布位置」列为空。请在导出表中补充头条/次条等信息后重新上传。
        </div>
      ) : pack.rawMissingRatio > 0.3 ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-[11px] text-slate-600">
          约 {(pack.rawMissingRatio * 100).toFixed(0)}
          % 的文章未标注位置，已归入「未标注」。
        </div>
      ) : null}

      <div>
        <p className="mb-3 text-xs font-medium text-slate-700">
          各号发文位置结构
        </p>
        <div
          className={`grid gap-4 ${pack.accs.length <= 1 ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3'}`}
        >
          {pieOptions.map((opt, idx) => (
            <div key={pack.accs[idx] ?? idx} style={{ height: pieHeight }}>
              <ReactECharts
                option={opt}
                style={{ height: '100%', width: '100%' }}
                className="w-full"
                notMerge
                lazyUpdate
              />
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <p className="mb-2 text-xs font-medium text-slate-700">
            各位置千次阅读互动数（Σ互动/Σ阅读×1000）
          </p>
          <ReactECharts
            option={barAirOption}
            style={{ height: barHeight }}
            className="w-full"
            notMerge
            lazyUpdate
          />
        </div>
        <div>
          <p className="mb-2 text-xs font-medium text-slate-700">
            各号不同位置的篇均阅读
          </p>
          <ReactECharts
            option={barAvgReadsOption}
            style={{ height: barHeight }}
            className="w-full"
            notMerge
            lazyUpdate
          />
        </div>
      </div>
    </div>
  )
}
