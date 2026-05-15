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
  tooltipItemLight,
  tooltipLight,
} from '../../lib/chartTheme'
import { avgInteractionRate } from '../../utils/metrics'
import { fmt } from '../../utils/format'
import { useDashboardStore } from '../../store/dashboardStore'

export function ChartBarAccounts({ height = 260 }: { height?: number }) {
  const comparisonData = useDashboardStore((s) => s.comparisonData)
  const filteredData = useDashboardStore((s) => s.filteredData)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)

  const singleMode = Boolean(selectedAccount)

  const pieOption = useMemo((): EChartsOption => {
    if (!filteredData.length || !singleMode) {
      return { ...baseTheme, graphic: noDataGraphic() }
    }
    const orig = filteredData.filter((r) => r.original === 1).length
    const repr = filteredData.filter((r) => r.original !== 1).length
    const total = orig + repr
    return {
      ...baseTheme,
      tooltip: tooltipItemLight,
      legend: {
        orient: 'horizontal',
        bottom: 8,
        textStyle: { color: chartTextMuted, fontSize: 11 },
        data: ['原创', '转载'],
      },
      series: [
        {
          name: '发文',
          type: 'pie',
          radius: ['40%', '68%'],
          center: ['50%', '46%'],
          avoidLabelOverlap: true,
          itemStyle: {
            borderRadius: 6,
            borderColor: '#fff',
            borderWidth: 2,
          },
          label: {
            formatter: (p: unknown) => {
              const x = p as { name?: string; value?: number; percent?: number }
              const v = Number(x.value ?? 0)
              const pct = Number(x.percent ?? 0)
              return `{name|${x.name ?? ''}}\n{val|${v} 篇} · {pct|${pct.toFixed(1)}%}`
            },
            rich: {
              name: { fontSize: 11, color: chartTextMuted },
              val: { fontSize: 11, fontWeight: 600, color: '#334155' },
              pct: { fontSize: 11, color: '#64748b' },
            },
          },
          data: [
            { value: orig, name: '原创', itemStyle: { color: COLORS[0] } },
            {
              value: repr,
              name: '转载',
              itemStyle: { color: '#cbd5e1' },
            },
          ],
        },
      ],
      graphic:
        total === 0
          ? noDataGraphic()
          : undefined,
    }
  }, [filteredData, singleMode])

  const { option } = useMemo(() => {
    const source = comparisonData
    if (!source.length || singleMode) {
      return {
        option: { ...baseTheme, graphic: noDataGraphic() } as EChartsOption,
      }
    }

    const accs = [...new Set(source.map((r) => r.account).filter(Boolean))].sort() as string[]
    const origCounts = accs.map(
      (a) => source.filter((r) => r.account === a && r.original === 1).length,
    )
    const reprCounts = accs.map(
      (a) => source.filter((r) => r.account === a && r.original !== 1).length,
    )

    const opt: EChartsOption = {
      ...baseTheme,
      tooltip: {
        ...tooltipLight,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: unknown) => {
          const items = Array.isArray(params) ? params : [params]
          const first = items[0] as { dataIndex?: number }
          const idx = first.dataIndex ?? 0
          const name = accs[idx] ?? ''
          const orig = origCounts[idx] ?? 0
          const repr = reprCounts[idx] ?? 0
          const total = orig + repr
          const origPct = total ? ((orig / total) * 100).toFixed(1) : '0.0'
          const reprPct = total ? ((repr / total) * 100).toFixed(1) : '0.0'
          return `${name}<br/>原创 ${orig} ${origPct}%<br/>转载 ${repr} ${reprPct}%`
        },
      },
      legend: {
        data: ['原创', '转载'],
        textStyle: { color: chartTextMuted },
        top: 0,
      },
      grid: categoryAxisGrid({ top: '18%', bottom: '24%' }),
      xAxis: {
        type: 'category',
        data: accs,
        axisLabel: horizontalCategoryAxisLabel(12),
        axisLine: { lineStyle: { color: chartBorder } },
        boundaryGap: true,
      },
      yAxis: {
        type: 'value',
        splitLine: { lineStyle: { color: chartSplit } },
        axisLabel: { color: chartTextMuted },
      },
      series: [
        {
          name: '原创',
          type: 'bar',
          stack: 'total',
          data: origCounts,
          barMaxWidth: 36,
          barCategoryGap: '35%',
          itemStyle: { color: COLORS[0], borderRadius: [0, 0, 0, 0] },
        },
        {
          name: '转载',
          type: 'bar',
          stack: 'total',
          data: reprCounts,
          barMaxWidth: 36,
          barCategoryGap: '35%',
          itemStyle: {
            color: '#cbd5e1',
            borderRadius: [4, 4, 0, 0],
          },
          label: {
            show: true,
            position: 'top',
            color: chartTextMuted,
            fontSize: 11,
            formatter: (p: { dataIndex?: number }) => {
              const idx = p.dataIndex ?? 0
              const o = origCounts[idx] ?? 0
              const r = reprCounts[idx] ?? 0
              const t = o + r
              return t ? `原创 ${((o / t) * 100).toFixed(1)}%` : ''
            },
          },
        },
      ],
    }

    return { option: opt }
  }, [comparisonData, singleMode])

  const tableSource = singleMode ? filteredData : comparisonData
  const tableAccsFinal = useMemo(() => {
    if (!tableSource.length) return [] as string[]
    if (singleMode && selectedAccount) return [selectedAccount]
    return [...new Set(tableSource.map((r) => r.account).filter(Boolean))].sort() as string[]
  }, [tableSource, singleMode, selectedAccount])

  const tableRows = useMemo(() => {
    if (!tableSource.length || !tableAccsFinal.length) return null
    const origRow = tableAccsFinal.map((a) => {
      const rows = tableSource.filter((r) => r.account === a && r.original === 1)
      const n = rows.length
      const reads = rows.reduce((s, r) => s + r.reads, 0)
      const avgRead = n ? Math.round(reads / n) : 0
      const air = avgInteractionRate(rows)
      return { avgRead, air }
    })
    const reprRow = tableAccsFinal.map((a) => {
      const rows = tableSource.filter((r) => r.account === a && r.original !== 1)
      const n = rows.length
      const reads = rows.reduce((s, r) => s + r.reads, 0)
      const avgRead = n ? Math.round(reads / n) : 0
      const air = avgInteractionRate(rows)
      return { avgRead, air }
    })
    return { origRow, reprRow }
  }, [tableSource, tableAccsFinal])

  if (!comparisonData.length && !filteredData.length) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">上传数据后显示</div>
    )
  }

  return (
    <div className="min-w-0">
      {singleMode ? (
        <ReactECharts
          option={pieOption}
          style={{ height }}
          className="w-full"
          notMerge
          lazyUpdate
        />
      ) : (
        <ReactECharts
          option={option}
          style={{ height }}
          className="w-full"
          notMerge
          lazyUpdate
        />
      )}
      {tableRows && tableAccsFinal.length > 0 ? (
        <div className="mt-3 overflow-x-auto border-t border-slate-100 pt-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            原创 / 转载表现对照（篇均阅读 · 平均互动率）
          </p>
          <table className="w-full min-w-[520px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1.5 pr-2 font-medium">类型</th>
                {tableAccsFinal.map((a) => (
                  <th key={a} className="px-2 py-1.5 font-medium">
                    <span className="line-clamp-2" title={a}>
                      {a}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="text-slate-700">
              <tr className="border-b border-slate-100">
                <td className="py-1.5 pr-2 text-slate-600">原创</td>
                {tableRows.origRow.map((cell, i) => (
                  <td key={i} className="px-2 py-1.5 font-mono tabular-nums">
                    {fmt(cell.avgRead)} 阅读/篇 · {(cell.air * 100).toFixed(2)}%
                  </td>
                ))}
              </tr>
              <tr>
                <td className="py-1.5 pr-2 text-slate-600">转载</td>
                {tableRows.reprRow.map((cell, i) => (
                  <td key={i} className="px-2 py-1.5 font-mono tabular-nums">
                    {fmt(cell.avgRead)} 阅读/篇 · {(cell.air * 100).toFixed(2)}%
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          <p className="mt-1.5 text-[10px] text-slate-400">
            平均互动率 = Σ(点赞+分享+在看)/Σ(阅读)，在同一原创/转载子集内计算。
          </p>
        </div>
      ) : null}
    </div>
  )
}
