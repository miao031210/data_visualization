import { format } from 'date-fns'
import type { ArticleRow } from '../types/article'
import { parsePublishDate } from './dates'
import { avgInteractionRate } from './metrics'

export type WeekBucket = { rows: ArticleRow[] }

/** ISO 周键 yyyy-'W'ww */
export function weekKeyFromDate(d: Date): string {
  return format(d, "yyyy-'W'II")
}

export function buildWeeklyInteractionByAccount(
  rows: ArticleRow[],
): {
  weekKeys: string[]
  byAccount: Record<string, Record<string, ArticleRow[]>>
} {
  const byAccount: Record<string, Record<string, ArticleRow[]>> = {}
  const weekSet = new Set<string>()

  for (const r of rows) {
    const d = parsePublishDate(r.publishTime)
    if (!d) continue
    const wk = weekKeyFromDate(d)
    weekSet.add(wk)
    const acc = r.account || '—'
    if (!byAccount[acc]) byAccount[acc] = {}
    if (!byAccount[acc][wk]) byAccount[acc][wk] = []
    byAccount[acc][wk].push(r)
  }

  const weekKeys = [...weekSet].sort()
  return { weekKeys, byAccount }
}

export function weekAirSeries(
  weekKeys: string[],
  accs: string[],
  byAccount: Record<string, Record<string, ArticleRow[]>>,
): Record<string, (number | null)[]> {
  const out: Record<string, (number | null)[]> = {}
  for (const a of accs) {
    out[a] = weekKeys.map((wk) => {
      const list = byAccount[a]?.[wk] ?? []
      if (!list.length) return null
      return avgInteractionRate(list)
    })
  }
  return out
}
