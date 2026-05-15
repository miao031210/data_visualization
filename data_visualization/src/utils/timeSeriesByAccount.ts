import type { ArticleRow } from '../types/article'
import {
  getMaxPublishDate,
  monthKeyFromDate,
  parsePublishDate,
  shouldExcludeLatestMonth,
} from './dates'

export interface MonthBucket {
  count: number
  reads: number
  interaction: number
}

export type MonthSeriesByAccount = Record<
  string,
  Record<string, MonthBucket>
>

/** 按月聚合各账号发文、阅读、互动；可选剔除不完整最新月 */
export function buildMonthlySeriesByAccount(
  rows: ArticleRow[],
  options?: { excludeIncompleteLatest?: boolean },
): {
  monthKeys: string[]
  series: MonthSeriesByAccount
  maxDate: Date | null
  dataAsOfLabel: string
} {
  const maxDate = getMaxPublishDate(rows)
  const series: MonthSeriesByAccount = {}
  const monthSet = new Set<string>()

  for (const r of rows) {
    const acc = r.account || '—'
    let mk: string | null = null
    const d = parsePublishDate(r.publishTime ?? r.publishMonth)
    if (d) mk = monthKeyFromDate(d)
    else if (r.publishMonth && /^\d{4}-\d{2}$/.test(String(r.publishMonth).trim())) {
      mk = String(r.publishMonth).trim()
    }
    if (!mk) continue

    monthSet.add(mk)
    if (!series[acc]) series[acc] = {}
    if (!series[acc][mk]) {
      series[acc][mk] = { count: 0, reads: 0, interaction: 0 }
    }
    const b = series[acc][mk]
    b.count += 1
    b.reads += r.reads
    b.interaction += r.likes + r.shares + r.sees
  }

  let monthKeys = [...monthSet].sort()
  if (options?.excludeIncompleteLatest !== false && maxDate) {
    const last = monthKeys[monthKeys.length - 1]
    if (last && shouldExcludeLatestMonth(last, maxDate)) {
      monthKeys = monthKeys.slice(0, -1)
    }
  }

  const dataAsOfLabel = maxDate
    ? `数据截至 ${monthKeyFromDate(maxDate)}-${String(maxDate.getDate()).padStart(2, '0')}`
    : ''

  return { monthKeys, series, maxDate, dataAsOfLabel }
}

/** 阅读环比：上月 → 本月 % */
export function momPercent(prev: number, curr: number): number | null {
  if (prev <= 0) return null
  return ((curr - prev) / prev) * 100
}
