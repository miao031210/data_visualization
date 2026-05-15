import type { EChartsOption } from 'echarts'
import { EMPTY_MSG } from '../constants/dashboard'

/** 浅色仪表盘下的 ECharts 基础样式 */
export const chartTextMuted = '#64748b'
export const chartBorder = '#e2e8f0'
export const chartSplit = '#f1f5f9'

export const baseTheme: Pick<
  EChartsOption,
  'backgroundColor' | 'textStyle'
> = {
  backgroundColor: 'transparent',
  textStyle: {
    fontFamily:
      'ui-sans-serif, system-ui, "Noto Sans SC", "PingFang SC", sans-serif',
    color: chartTextMuted,
  },
}

export function baseGrid(left = '12%', bottom = '12%') {
  return { left, right: '4%', bottom, containLabel: true }
}

/** 水平类目轴标签（截断过长文案，避免重叠；悬停柱子仍可在 tooltip 看全名） */
export function truncateAxisLabel(value: string, maxLen = 14): string {
  const s = String(value ?? '')
  return s.length <= maxLen ? s : `${s.slice(0, maxLen)}…`
}

export function horizontalCategoryAxisLabel(maxLen = 14) {
  return {
    color: chartTextMuted,
    rotate: 0,
    fontSize: 11,
    hideOverlap: true,
    formatter: (v: string) => truncateAxisLabel(v, maxLen),
  }
}

/** 类目轴图表专用：预留更大下边距以容纳水平文字 */
export function categoryAxisGrid(opts?: {
  left?: string
  right?: string
  top?: string
  bottom?: string
}) {
  return {
    left: opts?.left ?? '10%',
    right: opts?.right ?? '5%',
    top: opts?.top ?? '16%',
    bottom: opts?.bottom ?? '22%',
    containLabel: true,
  }
}

export function noDataGraphic(): EChartsOption['graphic'] {
  return [
    {
      type: 'text',
      left: 'center',
      top: 'center',
      style: {
        text: EMPTY_MSG,
        fill: '#94a3b8',
        fontSize: 13,
      },
    },
  ]
}

export const tooltipLight = {
  trigger: 'axis' as const,
  axisPointer: { type: 'shadow' as const },
  backgroundColor: '#ffffff',
  borderColor: chartBorder,
  textStyle: { color: '#334155' },
}

export const tooltipItemLight = {
  trigger: 'item' as const,
  backgroundColor: '#ffffff',
  borderColor: chartBorder,
  textStyle: { color: '#334155' },
}
