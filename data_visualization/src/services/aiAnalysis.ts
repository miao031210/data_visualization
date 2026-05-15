import type { ArticleRow } from '../types/article'
import { accountStats, totalInteraction } from '../utils/metrics'
import { API_BASE } from './apiConfig'

export interface AIAnalysisResult {
  content: string
  mode: 'all' | 'single'
}

interface AccountSummary {
  name: string
  article_count: number
  total_reads: number
  avg_reads: number
  total_interactions: number
  interaction_rate: string
  original_rate: string
  headline_avg_reads: number
  headline_interaction_rate: string
  non_headline_avg_reads: number
  non_headline_interaction_rate: string
  top_domains: Array<{ domain: string; count: number; avg_reads: number }>
}

interface TopArticle {
  account: string
  title: string
  url: string
  reads: number
  likes: number
  sees: number
  shares: number
  position: number
  original: number
  domain: string
  publish_month: string
}

interface MonthlyTrend {
  month: string
  account: string
  reads: number
  interactions: number
  article_count: number
  avg_reads: number
  interaction_rate: string
}

function buildAccountSummary(rows: ArticleRow[]): AccountSummary {
  const st = accountStats(rows)
  const headlineRows = rows.filter((r) => String(r.position) === '1')
  const nonHeadlineRows = rows.filter((r) => String(r.position) !== '1')
  const hSt = accountStats(headlineRows)
  const nhSt = accountStats(nonHeadlineRows)

  // Domain distribution
  const domainMap = new Map<string, { count: number; total_reads: number }>()
  for (const r of rows) {
    const d = r.domain || '未分类'
    const entry = domainMap.get(d) || { count: 0, total_reads: 0 }
    entry.count++
    entry.total_reads += r.reads
    domainMap.set(d, entry)
  }
  const top_domains = [...domainMap.entries()]
    .map(([domain, v]) => ({
      domain,
      count: v.count,
      avg_reads: Math.round(v.total_reads / v.count),
    }))
    .sort((a, b) => b.avg_reads - a.avg_reads)
    .slice(0, 5)

  const hInteractionRate = hSt.avgInteractionRate
  const nhInteractionRate = nhSt.avgInteractionRate

  return {
    name: rows[0]?.account || '未知',
    article_count: st.count,
    total_reads: st.reads,
    avg_reads: st.avgRead,
    total_interactions: rows.reduce((s, r) => s + totalInteraction(r), 0),
    interaction_rate: (st.avgInteractionRate * 100).toFixed(2) + '%',
    original_rate: (st.origRate * 100).toFixed(1) + '%',
    headline_avg_reads: hSt.avgRead,
    headline_interaction_rate: (hInteractionRate * 100).toFixed(2) + '%',
    non_headline_avg_reads: nhSt.avgRead,
    non_headline_interaction_rate: (nhInteractionRate * 100).toFixed(2) + '%',
    top_domains,
  }
}

function buildTopArticles(rows: ArticleRow[], limit: number): TopArticle[] {
  return [...rows]
    .sort((a, b) => b.reads - a.reads)
    .slice(0, limit)
    .map((r) => ({
      account: r.account,
      title: r.title || '',
      url: r.url || '',
      reads: r.reads,
      likes: r.likes,
      sees: r.sees,
      shares: r.shares,
      position: Number(r.position) || 0,
      original: r.original,
      domain: r.domain || '未分类',
      publish_month: r.publishMonth || '',
    }))
}

function buildMonthlyTrends(rows: ArticleRow[]): MonthlyTrend[] {
  const monthMap = new Map<
    string,
    Map<string, { reads: number; interactions: number; count: number }>
  >()
  for (const r of rows) {
    const month = r.publishMonth || '未知'
    if (!monthMap.has(month)) monthMap.set(month, new Map())
    const accMap = monthMap.get(month)!
    const acc = r.account
    if (!accMap.has(acc)) accMap.set(acc, { reads: 0, interactions: 0, count: 0 })
    const entry = accMap.get(acc)!
    entry.reads += r.reads
    entry.interactions += totalInteraction(r)
    entry.count++
  }

  const trends: MonthlyTrend[] = []
  const sortedMonths = [...monthMap.keys()].sort()
  for (const month of sortedMonths) {
    for (const [account, data] of monthMap.get(month)!) {
      trends.push({
        month,
        account,
        reads: data.reads,
        interactions: data.interactions,
        article_count: data.count,
        avg_reads: Math.round(data.reads / data.count),
        interaction_rate:
          data.reads > 0
            ? ((data.interactions / data.reads) * 100).toFixed(2) + '%'
            : '0%',
      })
    }
  }
  return trends
}

export function prepareAnalysisData(
  allData: ArticleRow[],
  filteredData: ArticleRow[],
  selectedAccount: string,
) {
  const mode = selectedAccount === '' ? 'all' : 'single'
  // allData 参数在全部账号模式下已经是 comparisonData（含标签筛选）
  const sourceData = mode === 'all' ? allData : filteredData

  // Group by account
  const accountGroups = new Map<string, ArticleRow[]>()
  for (const r of sourceData) {
    const key = r.account
    if (!accountGroups.has(key)) accountGroups.set(key, [])
    accountGroups.get(key)!.push(r)
  }

  const accounts = [...accountGroups.values()].map(buildAccountSummary)
  const topArticles = buildTopArticles(sourceData, mode === 'all' ? 30 : 20)
  const monthlyTrends = buildMonthlyTrends(sourceData)

  const allArticles = [...sourceData]
      .sort((a, b) => b.reads - a.reads)
      .slice(0, 30)
      .map((r) => ({
        title: r.title || '',
        url: r.url || '',
        reads: r.reads,
        likes: r.likes,
        sees: r.sees,
        shares: r.shares,
        position: r.position,
        domain: r.domain || '未分类',
        publish_month: r.publishMonth || '',
        original: r.original,
        summary: (r.summary || '').slice(0, 200),
        account: r.account || '',
      }))

  return {
    mode,
    accounts,
    top_articles: topArticles,
    monthly_trends: monthlyTrends,
    all_articles: allArticles,
  }
}

export async function runAIAnalysis(
  payload: ReturnType<typeof prepareAnalysisData>,
  onProgress: (progress: number, message: string) => void,
  onContent: (content: string) => void,
): Promise<void> {
  onProgress(10, '正在准备分析数据...')

  const response = await fetch(`${API_BASE}/api/analyze`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error(`API请求失败: ${response.status}`)
  }

  onProgress(20, '正在调用大模型分析...')

  const reader = response.body?.getReader()
  if (!reader) throw new Error('无法读取响应流')

  const decoder = new TextDecoder()
  let buffer = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const data = line.slice(6).trim()
      if (data === '[DONE]') {
        onProgress(100, '分析完成')
        return
      }
      try {
        const parsed = JSON.parse(data)
        if (parsed.progress) {
          onProgress(parsed.progress, parsed.message)
        }
        if (parsed.content) {
          onContent(parsed.content)
        }
        if (parsed.error) {
          throw new Error(parsed.error)
        }
      } catch {
        // skip parse errors for partial chunks
      }
    }
  }

  onProgress(100, '分析完成')
}
