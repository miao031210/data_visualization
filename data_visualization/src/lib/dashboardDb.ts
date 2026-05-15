import { openDB } from 'idb'
import type { ArticleRow } from '../types/article'
import type { OrigFilter } from '../types/filters'

const DB_NAME = 'wechat-dashboard-viz'
const STORE = 'kv'
const KEY = 'dashboard'

/** v1 activeAccounts[]；v2 selectedAccount；v3 标签；v4 时间区间 */
export const DASHBOARD_SNAPSHOT_VERSION = 4 as const

export interface DashboardSnapshot {
  version: typeof DASHBOARD_SNAPSHOT_VERSION
  allData: ArticleRow[]
  uploadedFiles: string[]
  selectedAccount: string
  domainFilter: string
  /** v4: 时间区间 */
  dateRangeStart: string
  dateRangeEnd: string
  origFilter: OrigFilter
  aiContent: Record<string, string>
  /** v3: 标签筛选 */
  selectedTags: string[]
  /** v3: article id → tags 持久化 */
  articleTags: Record<string, string[]>
}

function debounce<T extends (...args: Parameters<T>) => void>(
  fn: T,
  ms: number,
): (...args: Parameters<T>) => void {
  let t: ReturnType<typeof setTimeout> | undefined
  return (...args: Parameters<T>) => {
    if (t) clearTimeout(t)
    t = setTimeout(() => {
      t = undefined
      fn(...args)
    }, ms)
  }
}

async function openDashboardDb() {
  return openDB(DB_NAME, 1, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE)
      }
    },
  })
}

export async function loadDashboardSnapshot(): Promise<DashboardSnapshot | null> {
  try {
    const db = await openDashboardDb()
    const raw = await db.get(STORE, KEY)
    await db.close()
    if (!raw || typeof raw !== 'object') return null
    const snap = raw as Record<string, unknown>
    if (!Array.isArray(snap.allData)) return null

    const origFilter =
      snap.origFilter === 'all' || snap.origFilter === '1' || snap.origFilter === '0'
        ? snap.origFilter
        : 'all'

    const ver = typeof snap.version === 'number' ? snap.version : 1

    let selectedAccount = ''
    if (ver >= 2 && typeof snap.selectedAccount === 'string') {
      selectedAccount = snap.selectedAccount
    } else {
      const arr = Array.isArray(snap.activeAccounts)
        ? (snap.activeAccounts as string[])
        : []
      selectedAccount = arr[0] ?? ''
    }

    let selectedTags: string[] = []
    let articleTags: Record<string, string[]> = {}

    if (ver >= 3) {
      selectedTags = Array.isArray(snap.selectedTags)
        ? (snap.selectedTags as string[])
        : []
      articleTags =
        typeof snap.articleTags === 'object' && snap.articleTags !== null
          ? (snap.articleTags as Record<string, string[]>)
          : {}
    }

    let dateRangeStart = ''
    let dateRangeEnd = ''
    if (ver >= 4) {
      dateRangeStart = typeof snap.dateRangeStart === 'string' ? snap.dateRangeStart : ''
      dateRangeEnd = typeof snap.dateRangeEnd === 'string' ? snap.dateRangeEnd : ''
    }

    return {
      version: DASHBOARD_SNAPSHOT_VERSION,
      allData: snap.allData as ArticleRow[],
      uploadedFiles: Array.isArray(snap.uploadedFiles)
        ? (snap.uploadedFiles as string[])
        : [],
      selectedAccount,
      domainFilter: typeof snap.domainFilter === 'string' ? snap.domainFilter : '',
      dateRangeStart,
      dateRangeEnd,
      origFilter,
      aiContent:
        typeof snap.aiContent === 'object' && snap.aiContent !== null
          ? (snap.aiContent as Record<string, string>)
          : {},
      selectedTags,
      articleTags,
    }
  } catch {
    return null
  }
}

async function saveDashboardSnapshotImmediate(snap: DashboardSnapshot): Promise<void> {
  const db = await openDashboardDb()
  try {
    await db.put(STORE, snap, KEY)
  } finally {
    await db.close()
  }
}

export const debouncedSaveDashboard = debounce(
  (snap: DashboardSnapshot) => {
    void saveDashboardSnapshotImmediate(snap)
  },
  400,
)
