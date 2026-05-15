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
  tooltipLight,
} from '../../lib/chartTheme'
import { avgInteractionRate } from '../../utils/metrics'
import {
  buildWeeklyInteractionByAccount,
  weekAirSeries,
} from '../../utils/weeklySeries'
import { useDashboardStore } from '../../store/dashboardStore'

export function ChartEfficiency({ height = 220 }: { height?: number }) {
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)
  const comparisonData = useDashboardStore((s) => s.comparisonData)
  const filteredData = useDashboardStore((s) => s.filteredData)
  const viewData = selectedAccount ? filteredData : comparisonData

  const barOption = useMemo((): EChartsOption => {
    if (!viewData.length) {
      return { ...baseTheme }
    }

    const accs = [
      ...new Set(viewData.map((r) => r.account).filter(Boolean)),
    ].sort() as string[]
    const metrics = ['互动/千读', '在看/千读', '点赞/千读', '分享/千读']
    const keys = ['sees', 'likes', 'shares'] as const

    const series = metrics.map((m, mi) => ({
      name: m,
      type: 'bar' as const,
      data: accs.map((a) => {
        const rows = viewData.filter((r) => r.account === a)
        const reads = rows.reduce((s, r) => s + r.reads, 0)
        if (!reads) return 0
        if (mi === 0) {
          const inter = rows.reduce((s, r) => s + r.likes + r.shares + r.sees, 0)
          return Number(((inter / reads) * 1000).toFixed(2))
        }
        const val = rows.reduce((s, r) => s + r[keys[mi - 1]], 0)
        return Number(((val / reads) * 1000).toFixed(2))
      }),
      itemStyle: { color: COLORS[mi % COLORS.length] },
      barMaxWidth: 20,
    }))

    return {
      ...baseTheme,
      tooltip: {
        ...tooltipLight,
        axisPointer: { type: 'shadow' },
      },
      legend: {
        data: metrics,
        textStyle: { color: chartTextMuted },
        top: 0,
      },
      grid: categoryAxisGrid({ top: '18%', bottom: '26%' }),
      xAxis: {
        type: 'category',
        data: accs,
        axisLabel: horizontalCategoryAxisLabel(12),
        axisLine: { lineStyle: { color: chartBorder } },
      },
      yAxis: {
        type: 'value',
        name: '次/千次阅读',
        nameTextStyle: { color: chartTextMuted, fontSize: 10 },
        splitLine: { lineStyle: { color: chartSplit } },
        axisLabel: { color: chartTextMuted },
      },
      series,
    }
  }, [viewData])

  const tableRows = useMemo(() => {
    const accs = [
      ...new Set(viewData.map((r) => r.account).filter(Boolean)),
    ].sort() as string[]
    return accs.map((a) => {
      const rows = viewData.filter((r) => r.account === a)
      const reads = rows.reduce((s, r) => s + r.reads, 0)
      const air = avgInteractionRate(rows)
      const per1k = (field: 'sees' | 'likes' | 'shares') =>
        reads ? ((rows.reduce((s, r) => s + r[field], 0) / reads) * 1000).toFixed(2) : '—'
      const inter1k = reads
        ? (((rows.reduce((s, r) => s + r.likes + r.shares + r.sees, 0)) / reads) * 1000).toFixed(2)
        : '—'
      return {
        account: a,
        inter1k,
        like1k: per1k('likes'),
        share1k: per1k('shares'),
        see1k: per1k('sees'),
        airPct: (air * 100).toFixed(2),
      }
    })
  }, [viewData])

  const weeklyPack = useMemo(() => {
    const { weekKeys, byAccount } = buildWeeklyInteractionByAccount(viewData)
    const accs = [
      ...new Set(viewData.map((r) => r.account).filter(Boolean)),
    ].sort() as string[]
    const airMap =
      weekKeys.length && accs.length
        ? weekAirSeries(weekKeys, accs, byAccount)
        : null
    return { weekKeys, accs, airMap }
  }, [viewData])

  const weeklyOption = useMemo((): EChartsOption => {
    const { weekKeys, accs, airMap } = weeklyPack
    if (!weekKeys.length || !accs.length || !airMap) {
      return { ...baseTheme }
    }
    const series = accs.map((a, i) => ({
      name: a,
      type: 'line' as const,
      smooth: true,
      showSymbol: weekKeys.length < 40,
      lineStyle: { width: 2, color: COLORS[i % COLORS.length] },
      itemStyle: { color: COLORS[i % COLORS.length] },
      connectNulls: true,
      data: weekKeys.map((_, idx) => {
        const v = airMap[a]?.[idx]
        return v != null ? v * 100 : null
      }),
    }))

    return {
      ...baseTheme,
      tooltip: {
        ...tooltipLight,
        trigger: 'axis',
        valueFormatter: (v: unknown) =>
          typeof v === 'number' ? `${v.toFixed(2)}%` : String(v ?? ''),
      },
      legend: {
        type: 'scroll',
        data: accs,
        textStyle: { color: chartTextMuted, fontSize: 10 },
        top: 0,
      },
      grid: categoryAxisGrid({ top: '20%', bottom: '18%' }),
      xAxis: {
        type: 'category',
        data: weekKeys,
        axisLabel: {
          ...horizontalCategoryAxisLabel(9),
          rotate: weekKeys.length > 20 ? 35 : 0,
        },
        axisLine: { lineStyle: { color: chartBorder } },
      },
      yAxis: {
        type: 'value',
        name: '互动率%',
        nameTextStyle: { color: chartTextMuted, fontSize: 10 },
        splitLine: { lineStyle: { color: chartSplit } },
        axisLabel: {
          color: chartTextMuted,
          formatter: (v: number) => `${v}%`,
        },
      },
      series,
    }
  }, [weeklyPack])

  const showWeekly = weeklyPack.weekKeys.length >= 2

  return (
    <div className="min-w-0 space-y-4">
      <ReactECharts
        option={barOption}
        style={{ height }}
        className="w-full"
        notMerge
        lazyUpdate
      />

      {tableRows.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-slate-100 bg-slate-50/80 p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            精确数值（累计）
          </p>
          <table className="w-full min-w-[560px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1.5 pr-2 font-medium">公众号</th>
                <th className="px-2 py-1.5 font-medium">互动/千读</th>
                <th className="px-2 py-1.5 font-medium">点赞/千读</th>
                <th className="px-2 py-1.5 font-medium">分享/千读</th>
                <th className="px-2 py-1.5 font-medium">在看/千读</th>
                <th className="px-2 py-1.5 font-medium">综合互动率</th>
              </tr>
            </thead>
            <tbody>
              {tableRows.map((r) => (
                <tr key={r.account} className="border-b border-slate-100">
                  <td className="py-1.5 pr-2 text-slate-800">{r.account}</td>
                  <td className="px-2 py-1.5 font-mono tabular-nums font-semibold text-slate-900">{r.inter1k}</td>
                  <td className="px-2 py-1.5 font-mono tabular-nums">{r.like1k}</td>
                  <td className="px-2 py-1.5 font-mono tabular-nums">{r.share1k}</td>
                  <td className="px-2 py-1.5 font-mono tabular-nums">{r.see1k}</td>
                  <td className="px-2 py-1.5 font-mono tabular-nums text-slate-900">
                    {r.airPct}%
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[10px] text-slate-400">
            互动/千读 = Σ(点赞+分享+在看)/Σ(阅读)×1000，消除阅读量基数影响，优先用于排序和趋势分析。
            {selectedAccount
              ? ' 当前为所选公众号及下方筛选条件下的累计值。'
              : ' 顶栏选「全部账号」时为三账号同框；选单个号后仅显示该号。'}
          </p>
        </div>
      ) : null}

      {showWeekly ? (
        <div>
          <p className="mb-1 text-[11px] font-medium text-slate-600">
            近周综合互动率走势（按发布时间落在当周）
          </p>
          <ReactECharts
            option={weeklyOption}
            style={{ height: Math.min(260, height + 40) }}
            className="w-full"
            notMerge
            lazyUpdate
          />
        </div>
      ) : (
        <p className="text-[11px] text-slate-400">
          周趋势需至少两条「发布时间」可解析的记录落在不同 ISO 周。
        </p>
      )}
    </div>
  )
}
