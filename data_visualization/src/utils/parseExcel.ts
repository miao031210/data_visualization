import * as XLSX from 'xlsx'
import { format, isValid, parse } from 'date-fns'
import type { ArticleRow } from '../types/article'
import { COL_MAP } from '../constants/dashboard'

const NUM_FIELDS = ['reads', 'sees', 'likes', 'shares', 'original'] as const

function normalizePublishMonth(row: ArticleRow): void {
  if (row.publishMonth && String(row.publishMonth).trim()) {
    row.publishMonth = String(row.publishMonth).trim()
    return
  }
  const pt = row.publishTime
  if (pt instanceof Date && !Number.isNaN(pt.getTime())) {
    row.publishMonth = format(pt, 'yyyy-MM')
    return
  }
  if (typeof pt === 'number' && pt > 20000) {
    const epoch = new Date(Math.round((pt - 25569) * 86400 * 1000))
    if (!Number.isNaN(epoch.getTime())) {
      row.publishMonth = format(epoch, 'yyyy-MM')
    }
    return
  }
  if (typeof pt === 'string' && pt.trim()) {
    const cleaned = pt.trim()
    const patterns = [
      'yyyy-MM-dd HH:mm:ss',
      'yyyy/MM/dd HH:mm:ss',
      'yyyy-MM-dd',
      'yyyy/MM/dd',
    ]
    for (const p of patterns) {
      const d = parse(cleaned, p, new Date())
      if (isValid(d)) {
        row.publishMonth = format(d, 'yyyy-MM')
        return
      }
    }
  }
}

function rawToArticleRow(raw: Record<string, unknown>): ArticleRow {
  const row: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw)) {
    const key = k.trim()
    const mapped = COL_MAP[key] ?? key
    row[String(mapped)] = v
  }

  const article: ArticleRow = {
    account: String(row.account ?? ''),
    original: Number(row.original) || 0,
    reads: Number(row.reads) || 0,
    sees: Number(row.sees) || 0,
    likes: Number(row.likes) || 0,
    shares: Number(row.shares) || 0,
    id: row.id as ArticleRow['id'],
    accountId: row.accountId as string | undefined,
    author: row.author as string | undefined,
    position: row.position as string | undefined,
    title: row.title as string | undefined,
    summary: row.summary as string | undefined,
    url: row.url as string | undefined,
    publishTime: row.publishTime as ArticleRow['publishTime'],
    publishMonth: row.publishMonth as string | undefined,
    accountType: row.accountType as string | undefined,
    domain: row.domain as string | undefined,
    articleTag: row.articleTag as string | undefined,
  }

  for (const f of NUM_FIELDS) {
    article[f] = Number(article[f]) || 0
  }

  normalizePublishMonth(article)
  return article
}

export function readExcelFile(file: File): Promise<ArticleRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = e.target?.result
        if (data == null) {
          resolve([])
          return
        }
        const wb = XLSX.read(data, { type: 'binary', cellDates: true })
        const rows: ArticleRow[] = []
        for (const sheetName of wb.SheetNames) {
          const sheet = wb.Sheets[sheetName]
          if (!sheet) continue
          const json = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, {
            defval: '',
          })
          for (const raw of json) {
            rows.push(rawToArticleRow(raw))
          }
        }
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsBinaryString(file)
  })
}

export function rowDedupeKey(r: ArticleRow): string {
  const id = r.id != null && r.id !== '' ? String(r.id) : ''
  if (id) return id
  return `${r.title ?? ''}@@${r.account ?? ''}`
}
