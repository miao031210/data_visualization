import { format, endOfMonth, isValid, parseISO } from 'date-fns'
import type { ArticleRow } from '../types/article'

export function parsePublishDate(
  raw: string | number | Date | undefined,
): Date | null {
  if (!raw) return null
  if (raw instanceof Date) return Number.isNaN(raw.getTime()) ? null : raw
  if (typeof raw === 'number' && raw > 20000) {
    const d = new Date(Math.round((raw - 25569) * 86400 * 1000))
    return Number.isNaN(d.getTime()) ? null : d
  }
  if (typeof raw === 'string') {
    const cleaned = raw.trim()
    let d = parseISO(cleaned)
    if (isValid(d)) return d
    d = new Date(cleaned)
    if (isValid(d)) return d
    d = new Date(cleaned.replace(/\//g, '-'))
    if (isValid(d)) return d
  }
  return null
}

/** 从文章行推断用于趋势的最大日期（优先发布时间） */
export function getMaxPublishDate(rows: ArticleRow[]): Date | null {
  let max: Date | null = null
  for (const r of rows) {
    const d = parsePublishDate(r.publishTime ?? r.publishMonth)
    if (d && (!max || d > max)) max = d
    if (!d && r.publishMonth && /^\d{4}-\d{2}$/.test(String(r.publishMonth))) {
      const [y, m] = String(r.publishMonth).split('-').map(Number)
      const approx = new Date(y, m - 1, 15)
      if (!Number.isNaN(approx.getTime()) && (!max || approx > max)) max = approx
    }
  }
  return max
}

export function monthKeyFromDate(d: Date): string {
  return format(d, 'yyyy-MM')
}

/** 最新数据月是否未覆盖到该月末：若是则从趋势中剔除该月 */
export function shouldExcludeLatestMonth(
  monthKey: string,
  maxDate: Date | null,
): boolean {
  if (!maxDate) return false
  const mk = format(maxDate, 'yyyy-MM')
  if (monthKey !== mk) return false
  const end = endOfMonth(maxDate)
  return maxDate < end
}
