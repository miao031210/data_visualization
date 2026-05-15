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
} from '../../lib/chartTheme'
import { momPercent } from '../../utils/timeSeriesByAccount'
import { buildMonthlySeriesByAccount } from '../../utils/timeSeriesByAccount'
import { useDashboardStore } from '../../store/dashboardStore'

function multiLineOption(args: {
  monthKeys: string[]
  accs: string[]
  series: Record<string, Record<string, { count: number; reads: number; interaction: number }>>
  metric: 'count' | 'reads' | 'interaction'
  names: Record<'count' | 'reads' | 'interaction', string>
}): EChartsOption {
  const { monthKeys, accs, series, metric, names } = args
  if (!monthKeys.length || !accs.length) {
    return { ...baseTheme, graphic: noDataGraphic() }
  }

  const seriesList = accs.map((acc, i) => ({
    name: acc,
    type: 'line' as const,
    smooth: true,
    showSymbol: monthKeys.length < 24,
    lineStyle: { width: 2, color: COLORS[i % COLORS.length] },
    itemStyle: { color: COLORS[i % COLORS.length] },
    data: monthKeys.map((mk) => {
      const b = series[acc]?.[mk]
      if (!b) return 0
      return b[metric]
    }),
  }))

  return {
    ...baseTheme,
    tooltip: {
      ...tooltipLight,
      trigger: 'axis',
    },
    legend: {
      type: 'scroll',
      data: accs,
      textStyle: { color: chartTextMuted, fontSize: 10 },
      top: 0,
    },
    grid: categoryAxisGrid({ top: accs.length > 4 ? '22%' : '18%', bottom: '18%' }),
    xAxis: {
      type: 'category',
      data: monthKeys,
      axisLabel: horizontalCategoryAxisLabel(11),
      axisLine: { lineStyle: { color: chartBorder } },
    },
    yAxis: {
      type: 'value',
      name: names[metric],
      nameTextStyle: { color: chartTextMuted, fontSize: 10 },
      splitLine: { lineStyle: { color: chartSplit } },
      axisLabel: { color: chartTextMuted },
    },
    series: seriesList,
  }
}

export function ChartMonthlyTrends({ chartHeight = 240 }: { chartHeight?: number }) {
  const comparisonData = useDashboardStore((s) => s.comparisonData)
  const filteredData = useDashboardStore((s) => s.filteredData)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)

  const trendRows = selectedAccount ? filteredData : comparisonData

  const pack = useMemo(() => {
    const {
      monthKeys,
      series,
      dataAsOfLabel,
    } = buildMonthlySeriesByAccount(trendRows, {
      excludeIncompleteLatest: true,
    })
    const accs = [
      ...new Set(trendRows.map((r) => r.account).filter(Boolean)),
    ].sort() as string[]
    return { monthKeys, series, dataAsOfLabel, accs }
  }, [trendRows])

  const optCount = useMemo(
    () =>
      multiLineOption({
        monthKeys: pack.monthKeys,
        accs: pack.accs,
        series: pack.series,
        metric: 'count',
        names: {
          count: '篇',
          reads: '阅读',
          interaction: '互动',
        },
      }),
    [pack],
  )

  const optReads = useMemo(
    () =>
      multiLineOption({
        monthKeys: pack.monthKeys,
        accs: pack.accs,
        series: pack.series,
        metric: 'reads',
        names: {
          count: '篇',
          reads: '阅读',
          interaction: '互动',
        },
      }),
    [pack],
  )

  const optInter = useMemo(
    () =>
      multiLineOption({
        monthKeys: pack.monthKeys,
        accs: pack.accs,
        series: pack.series,
        metric: 'interaction',
        names: {
          count: '篇',
          reads: '阅读',
          interaction: '互动',
        },
      }),
    [pack],
  )

  const momRows = useMemo(() => {
    const { monthKeys, series, accs } = pack
    if (monthKeys.length < 2) return []
    const rows: { month: string; cells: (number | null)[] }[] = []
    const single = Boolean(selectedAccount)
    for (let i = 1; i < monthKeys.length; i++) {
      const prevM = monthKeys[i - 1]
      const currM = monthKeys[i]
      const cells = single
        ? [
            momPercent(
              series[accs[0] ?? '']?.[prevM]?.reads ?? 0,
              series[accs[0] ?? '']?.[currM]?.reads ?? 0,
            ),
          ]
        : accs.map((a) => {
            const prev = series[a]?.[prevM]?.reads ?? 0
            const curr = series[a]?.[currM]?.reads ?? 0
            return momPercent(prev, curr)
          })
      rows.push({ month: currM, cells })
    }
    return rows
  }, [pack, selectedAccount])

  const subtitle = pack.dataAsOfLabel
    ? `${pack.dataAsOfLabel}；不完整当月已从曲线剔除`
    : '按月聚合（剔除不完整当月）'

  if (!trendRows.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-400">
        上传数据后显示月度趋势
      </div>
    )
  }

  if (!pack.monthKeys.length) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50/80 p-4 text-sm text-amber-900">
        未解析到有效的发布月份。请为每行补充「发布时间」或「发布时间(年月)」列后重新上传。
      </div>
    )
  }

  return (
    <div className="flex min-w-0 flex-col gap-4">
      <div>
        <p className="mb-1 text-[11px] text-slate-500">{subtitle}</p>
        <div className="grid gap-4 xl:grid-cols-1">
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-700">
              各号月度发文量
            </p>
            <ReactECharts
              option={optCount}
              style={{ height: chartHeight }}
              className="w-full"
              notMerge
              lazyUpdate
            />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-700">
              各号月度阅读总量
            </p>
            <ReactECharts
              option={optReads}
              style={{ height: chartHeight }}
              className="w-full"
              notMerge
              lazyUpdate
            />
          </div>
          <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
            <p className="mb-2 text-xs font-medium text-slate-700">
              各号月度互动总量（点赞+分享+在看）
            </p>
            <ReactECharts
              option={optInter}
              style={{ height: chartHeight }}
              className="w-full"
              notMerge
              lazyUpdate
            />
          </div>
        </div>
      </div>

      {momRows.length > 0 && pack.accs.length > 0 ? (
        <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white p-3">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-wide text-slate-400">
            阅读量环比上月（%）
            {selectedAccount ? ` · ${selectedAccount}` : ''}
          </p>
          <table className="w-full min-w-[280px] border-collapse text-[11px]">
            <thead>
              <tr className="border-b border-slate-200 text-left text-slate-500">
                <th className="py-1.5 pr-3 font-medium">月份</th>
                {!selectedAccount ? (
                  pack.accs.map((a) => (
                    <th key={a} className="px-2 py-1.5 font-medium">
                      <span className="line-clamp-2 max-w-[140px]" title={a}>
                        {a}
                      </span>
                    </th>
                  ))
                ) : (
                  <th className="px-2 py-1.5 font-medium">环比</th>
                )}
              </tr>
            </thead>
            <tbody>
              {momRows.filter((row) => row.month.startsWith('2026')).map((row) => (
                <tr key={row.month} className="border-b border-slate-100">
                  <td className="py-1.5 pr-3 font-mono text-slate-700">
                    {row.month}
                  </td>
                  {row.cells.map((v, i) => (
                    <td
                      key={i}
                      className={`px-2 py-1.5 font-mono tabular-nums ${
                        v == null
                          ? 'text-slate-400'
                          : v >= 0
                            ? 'text-emerald-700'
                            : 'text-rose-700'
                      }`}
                    >
                      {v == null ? '—' : `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </div>
  )
}
