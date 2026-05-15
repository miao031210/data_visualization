import type { ArticleRow } from '../types/article'

export interface WordCloudItem {
  name: string
  value: number
  itemStyle?: { color: string }
}

const STOP_WORDS = new Set([
  '的', '了', '在', '是', '我', '有', '和', '就', '不', '人', '都', '一',
  '一个', '这', '他', '也', '与', '及', '或', '等', '被', '从', '把',
  '而', '但', '且', '为', '以', '所', '其', '要', '会', '可', '能',
  '对', '该', '上', '下', '中', '到', '说', '去', '来', '看', '让',
  '将', '只', '更', '最', '很', '还', '没', '多', '前', '后', '着',
  '那', '些', '之', '用', '过', '如', '呢', '吗', '吧', '啊', '哦',
  '做', '出', '它', '们', '你', '她', '什么', '怎么', '哪', '才',
  '已', '又', '太', '再', '可以', '这个', '那个', '已经', '我们',
  '他们', '自己', '因为', '所以', '如果', '虽然', '但是', '然后',
  '这个', '哪个', '这样', '那样', '现在', '比较', '不是', '需要',
  '主要', '还是', '只是', '就是', '这种', '其实', '真的', '觉得',
])

function isNumericOrPunct(s: string): boolean {
  return /^[\d.,%+=\-*/<>()[\]{}|&$#@!~`^:'";?\s]+$/.test(s)
}

let segmenterSupported = true

function segmentText(text: string, segmenter: Intl.Segmenter): string[] {
  const tokens: string[] = []
  for (const seg of segmenter.segment(text)) {
    if (!seg.isWordLike) continue
    const w = seg.segment.trim()
    if (!w) continue
    if (w.length < 2) continue
    if (isNumericOrPunct(w)) continue
    if (STOP_WORDS.has(w)) continue
    // also skip pure ASCII words shorter than 3 chars (mostly noise)
    if (/^[a-zA-Z]+$/.test(w) && w.length < 3) continue
    tokens.push(w)
  }
  return tokens
}

function assignColors(items: WordCloudItem[]): WordCloudItem[] {
  if (!items.length) return items
  const maxVal = items[0].value
  return items.map((item) => ({
    ...item,
    itemStyle: {
      color:
        item.value >= maxVal * 0.6
          ? '#f7884f'
          : item.value >= maxVal * 0.3
            ? '#4f8ef7'
            : '#36d9a4',
    },
  }))
}

export function extractKeywords(
  rows: ArticleRow[],
  options?: {
    topN?: number
    minFreq?: number
  },
): WordCloudItem[] {
  const { topN = 60, minFreq = 2 } = options ?? {}

  const titles = rows
    .map((r) => r.title?.trim())
    .filter((t): t is string => !!t)

  if (!titles.length) return []

  if (!segmenterSupported) return []

  let segmenter: Intl.Segmenter
  try {
    segmenter = new Intl.Segmenter('zh-CN', { granularity: 'word' })
  } catch {
    segmenterSupported = false
    console.warn('Intl.Segmenter not available; word cloud disabled')
    return []
  }

  const freq = new Map<string, number>()
  for (const title of titles) {
    for (const token of segmentText(title, segmenter)) {
      freq.set(token, (freq.get(token) ?? 0) + 1)
    }
  }

  const items: WordCloudItem[] = []
  for (const [name, value] of freq) {
    if (value >= minFreq) {
      items.push({ name, value })
    }
  }

  items.sort((a, b) => b.value - a.value)
  return assignColors(items.slice(0, topN))
}
