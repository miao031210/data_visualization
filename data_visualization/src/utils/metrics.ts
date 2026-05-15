import type { ArticleRow } from '../types/article'
import { fmt, fmtPct } from './format'

export function totalInteraction(r: ArticleRow): number {
  return r.likes + r.shares + r.sees
}

/** Σ(点赞+分享+在看) / Σ(阅读) */
export function avgInteractionRate(rows: ArticleRow[]): number {
  const reads = rows.reduce((s, r) => s + r.reads, 0)
  if (!reads) return 0
  const inter = rows.reduce((s, r) => s + totalInteraction(r), 0)
  return inter / reads
}

/** 千次阅读互动数：每千次阅读带来的点赞+分享+在看数 */
export function interactionsPer1kReads(rows: ArticleRow[]): number {
  const reads = rows.reduce((s, r) => s + r.reads, 0)
  if (!reads) return 0
  const inter = rows.reduce((s, r) => s + totalInteraction(r), 0)
  return (inter / reads) * 1000
}

export function accountStats(rows: ArticleRow[]) {
  const n = rows.length
  const reads = rows.reduce((s, r) => s + r.reads, 0)
  const origCount = rows.filter((r) => r.original === 1).length
  const avgRead = n ? Math.round(reads / n) : 0
  const origRate = n ? origCount / n : 0
  const air = avgInteractionRate(rows)
  const ip1k = interactionsPer1kReads(rows)
  return {
    count: n,
    reads,
    avgRead,
    origRate,
    avgInteractionRate: air,
    interactionsPer1k: ip1k,
    display: {
      count: fmt(n),
      reads: fmt(reads),
      avgRead: fmt(avgRead),
      origRate: fmtPct(origRate),
      avgInteractionRate: fmtPct(air),
      interactionsPer1k: ip1k.toFixed(1),
    },
  }
}
