export interface ArticleRow {
  id?: string | number
  account: string
  accountId?: string
  author?: string
  position?: string
  original: number
  title?: string
  summary?: string
  url?: string
  reads: number
  sees: number
  likes: number
  shares: number
  publishTime?: string | Date | number
  publishMonth?: string
  accountType?: string
  domain?: string
  articleTag?: string
  /** 该行来自哪次上传的文件（用于按文件移除） */
  sourceFile?: string
  /** 病种/主题标签（离线预打标，从JSON读取） */
  tags?: string[]
}
