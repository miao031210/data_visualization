import { useMemo } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption } from 'echarts'
import 'echarts-wordcloud'
import { useDashboardStore } from '../../store/dashboardStore'
import { extractKeywords } from '../../utils/keywords'
import { baseTheme } from '../../lib/chartTheme'

export function WordCloudCard() {
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)
  const comparisonData = useDashboardStore((s) => s.comparisonData)
  const filteredData = useDashboardStore((s) => s.filteredData)
  const rows = selectedAccount ? filteredData : comparisonData
  const isAllAccounts = selectedAccount === ''

  const keywords = useMemo(
    () => extractKeywords(rows, { topN: 60, minFreq: 2 }),
    [rows],
  )

  const option = useMemo((): EChartsOption => {
    if (!keywords.length) return { ...baseTheme }
    return {
      ...baseTheme,
      tooltip: {
        backgroundColor: '#ffffff',
        borderColor: '#e2e8f0',
        textStyle: { color: '#334155' },
        formatter: (params: unknown) => {
          const p = params as { name?: string; value?: number }
          return `${p.name ?? ''}: ${p.value ?? 0} 次`
        },
      },
      series: [
        {
          type: 'wordCloud',
          shape: 'circle',
          sizeRange: [14, 72],
          rotationRange: [-45, 45],
          rotationStep: 45,
          gridSize: 6,
          drawOutOfBound: false,
          layoutAnimation: true,
          width: '90%',
          height: '85%',
          left: 'center',
          top: 'center',
          textStyle: {
            fontFamily:
              'ui-sans-serif, system-ui, "Noto Sans SC", "PingFang SC", sans-serif',
            fontWeight: 'normal' as const,
          },
          emphasis: {
            focus: 'self' as const,
            textStyle: {
              fontWeight: 'bold' as const,
            },
          },
          data: keywords.map((item) => ({
            name: item.name,
            value: item.value,
            textStyle: {
              color: item.itemStyle?.color,
            },
          })),
        },
      ],
    }
  }, [keywords])

  if (!rows.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-4">
        <p className="text-[11px] text-slate-400">上传数据后显示关键词词云</p>
      </div>
    )
  }

  if (!keywords.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-slate-200 bg-white p-4">
        <p className="text-[11px] text-slate-400">当前标题数据未提取到有效关键词</p>
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex shrink-0 items-center justify-between border-b border-slate-100 px-4 py-2">
        <div>
          <h3 className="text-xs font-semibold text-slate-700">
            关键词词云
          </h3>
          <p className="text-[10px] text-slate-400">
            {isAllAccounts
              ? `全账号 · 基于 ${rows.length} 篇文章标题提取 ${keywords.length} 个关键词`
              : `${selectedAccount} · 基于 ${rows.length} 篇文章标题提取 ${keywords.length} 个关键词`}
          </p>
        </div>
        <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] text-blue-600">
          词云
        </span>
      </div>

      <div className="flex-1 min-h-0 flex items-center justify-center bg-white p-3">
        <ReactECharts
          option={option}
          style={{ height: '100%', width: '100%' }}
          notMerge
          lazyUpdate
        />
      </div>
    </div>
  )
}
