import type { ArticleRow } from '../types/article'

interface JsonArticle {
  id: number
  name: string
  account: string
  order: number
  title: string
  digest: string
  author: string
  content_url: string
  read_num: number
  like_num: number
  old_like_num: number
  share_num: number
  publish_date: string
  copyright_stat: number | string
  tags?: string[]
}

function extractPublishMonth(publishDate: string): string {
  if (!publishDate) return ''
  const d = new Date(publishDate)
  if (Number.isNaN(d.getTime())) return publishDate.slice(0, 7)
  const m = d.getMonth() + 1
  return `${d.getFullYear()}-${m < 10 ? '0' : ''}${m}`
}

function jsonToArticleRow(raw: JsonArticle): ArticleRow {
  return {
    id: raw.id,
    account: raw.name,
    accountId: raw.account,
    original: Number(raw.copyright_stat) || 0,
    position: String(raw.order ?? ''),
    title: raw.title,
    summary: raw.digest,
    author: raw.author,
    url: raw.content_url,
    reads: Number(raw.read_num) || 0,
    sees: Number(raw.like_num) || 0,
    likes: Number(raw.old_like_num) || 0,
    shares: Number(raw.share_num) || 0,
    publishTime: raw.publish_date,
    publishMonth: extractPublishMonth(raw.publish_date),
    tags: raw.tags,
  }
}

export async function loadArticlesFromJson(
  fileName: string,
): Promise<ArticleRow[]> {
  const resp = await fetch(`/datas/${fileName}`)
  if (!resp.ok) throw new Error(`Failed to load ${fileName}: ${resp.status}`)
  const json: JsonArticle[] = await resp.json()
  return json.map((raw) => ({
    ...jsonToArticleRow(raw),
    sourceFile: fileName,
  }))
}

export function readJsonFile(file: File): Promise<ArticleRow[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const json: JsonArticle[] = JSON.parse(e.target?.result as string)
        resolve(
          json.map((raw) => ({
            ...jsonToArticleRow(raw),
            sourceFile: file.name,
          })),
        )
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = () => reject(reader.error)
    reader.readAsText(file)
  })
}

export const JSON_FILES = [
  'articles_greenlore.json',
  'articles_yyck.json',
  'articles_xy.json',
]

export async function loadAllJsonFiles(): Promise<ArticleRow[]> {
  const results = await Promise.all(
    JSON_FILES.map((f) =>
      loadArticlesFromJson(f).catch((err) => {
        console.warn(`Skipping ${f}:`, err)
        return [] as ArticleRow[]
      }),
    ),
  )
  return results.flat()
}
