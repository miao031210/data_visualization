import { create } from 'zustand'
import type { ArticleRow } from '../types/article'
import type { OrigFilter } from '../types/filters'
import {
  DASHBOARD_SNAPSHOT_VERSION,
  debouncedSaveDashboard,
  loadDashboardSnapshot,
  type DashboardSnapshot,
} from '../lib/dashboardDb'
import { readExcelFile, rowDedupeKey } from '../utils/parseExcel'
import {
  loadAllJsonFiles,
  readJsonFile,
  JSON_FILES,
} from '../utils/parseJson'

export type { OrigFilter }

export interface DashboardState {
  allData: ArticleRow[]
  filteredData: ArticleRow[]
  /** 三账号对比 KPI / 堆叠图等：不含公众号筛选，其余与 FilterBar 一致 */
  comparisonData: ArticleRow[]
  accountNames: string[]
  /** 当前查看的单个公众号（单选） */
  selectedAccount: string
  domainFilter: string
  dateRangeStart: string
  dateRangeEnd: string
  origFilter: OrigFilter
  searchKeyword: string
  uploadedFiles: string[]
  hasData: boolean
  /** AI 分析内容，key 为账号名（空字符串表示全部账号） */
  aiContent: Record<string, string>
  /** 标签筛选 */
  selectedTags: string[]
  /** 所有可用的标签（去重排序） */
  availableTags: string[]
  addFiles: (files: FileList | File[]) => Promise<void>
  removeUploadedFile: (fileName: string) => void
  loadJsonFiles: () => Promise<void>
  reloadData: () => Promise<void>
  setSelectedAccount: (name: string) => void
  setDomainFilter: (v: string) => void
  setDateRange: (start: string, end: string) => void
  setOrigFilter: (v: OrigFilter) => void
  setSearchKeyword: (v: string) => void
  setAIContent: (key: string, content: string) => void
  /** 标签相关 */
  setSelectedTags: (tags: string[]) => void
}

interface FilterParams {
  allData: ArticleRow[]
  selectedAccount: string
  domainFilter: string
  dateRangeStart: string
  dateRangeEnd: string
  origFilter: OrigFilter
  searchKeyword: string
  selectedTags: string[]
}

function hasMatchingTag(articleTags: string[] | undefined, selected: string[]): boolean {
  if (!selected.length) return true
  if (!articleTags || !articleTags.length) return false
  return selected.some((t) => articleTags.includes(t))
}

function computeFiltered(state: FilterParams): ArticleRow[] {
  return state.allData.filter((r) => {
    if (state.selectedAccount && r.account !== state.selectedAccount) return false
    if (state.domainFilter && r.domain !== state.domainFilter) return false
    if (!dateInRange(r.publishMonth, state.dateRangeStart, state.dateRangeEnd)) return false
    if (state.origFilter === '1' && r.original !== 1) return false
    if (state.origFilter === '0' && r.original !== 0) return false
    if (state.searchKeyword) {
      const kw = state.searchKeyword.toLowerCase()
      const haystack = [(r.title ?? ''), (r.summary ?? '')].join(' ').toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    if (!hasMatchingTag(r.tags, state.selectedTags)) return false
    return true
  })
}

function dateInRange(publishMonth: string | undefined, start: string, end: string): boolean {
  if (!start && !end) return true
  if (!publishMonth) return false
  if (start && publishMonth < start) return false
  if (end && publishMonth > end) return false
  return true
}

/** 跨账号对比用：仅 domain / 月 / 原创筛选，不按公众号过滤 */
function computeComparisonFiltered(state: Omit<FilterParams, 'selectedAccount'>): ArticleRow[] {
  return state.allData.filter((r) => {
    if (state.domainFilter && r.domain !== state.domainFilter) return false
    if (!dateInRange(r.publishMonth, state.dateRangeStart, state.dateRangeEnd)) return false
    if (state.origFilter === '1' && r.original !== 1) return false
    if (state.origFilter === '0' && r.original !== 0) return false
    if (state.searchKeyword) {
      const kw = state.searchKeyword.toLowerCase()
      const haystack = [(r.title ?? ''), (r.summary ?? '')].join(' ').toLowerCase()
      if (!haystack.includes(kw)) return false
    }
    if (!hasMatchingTag(r.tags, state.selectedTags)) return false
    return true
  })
}

function computeAccountNames(allData: ArticleRow[]): string[] {
  return [...new Set(allData.map((r) => r.account).filter(Boolean))].sort() as string[]
}

function reconcileSelectedAccount(
  previous: string,
  accountNames: string[],
): string {
  if (!accountNames.length) return ''
  if (previous === '' && accountNames.length > 0) return ''
  if (previous && accountNames.includes(previous)) return previous
  return accountNames[0] ?? ''
}

function makeFilterParams(s: DashboardState): FilterParams {
  return {
    allData: s.allData,
    selectedAccount: s.selectedAccount,
    domainFilter: s.domainFilter,
    dateRangeStart: s.dateRangeStart,
    dateRangeEnd: s.dateRangeEnd,
    origFilter: s.origFilter,
    searchKeyword: s.searchKeyword,
    selectedTags: s.selectedTags,
  }
}

function computeAvailableTags(allData: ArticleRow[]): string[] {
  const tagSet = new Set<string>()
  for (const r of allData) {
    if (r.tags) {
      for (const t of r.tags) {
        tagSet.add(t)
      }
    }
  }
  return [...tagSet].sort()
}

function toSnapshot(state: DashboardState): DashboardSnapshot {
  // Build article tags map for persistence
  const articleTags: Record<string, string[]> = {}
  for (const r of state.allData) {
    if (r.id != null && r.tags && r.tags.length > 0) {
      articleTags[String(r.id)] = r.tags
    }
  }
  return {
    version: DASHBOARD_SNAPSHOT_VERSION,
    allData: state.allData,
    uploadedFiles: state.uploadedFiles,
    selectedAccount: state.selectedAccount,
    domainFilter: state.domainFilter,
    dateRangeStart: state.dateRangeStart,
    dateRangeEnd: state.dateRangeEnd,
    origFilter: state.origFilter,
    aiContent: state.aiContent,
    selectedTags: state.selectedTags,
    articleTags,
  }
}

export const useDashboardStore = create<DashboardState>((set, get) => ({
  allData: [],
  filteredData: [],
  comparisonData: [],
  accountNames: [],
  selectedAccount: '',
  domainFilter: '',
  dateRangeStart: '',
  dateRangeEnd: '',
  origFilter: 'all',
  searchKeyword: '',
  uploadedFiles: [],
  hasData: false,
  aiContent: {},
  selectedTags: [],
  availableTags: [],

  addFiles: async (files) => {
    const list = Array.from(files)
    const s0 = get()
    const existIds = new Set(s0.allData.map((r) => rowDedupeKey(r)))
    const toAppend: ArticleRow[] = []
    const newFileNames: string[] = []

    for (const file of list) {
      const isJson = file.name.toLowerCase().endsWith('.json')
      const rows = isJson
        ? await readJsonFile(file)
        : await readExcelFile(file)
      const tagged = rows.map((r) => ({ ...r, sourceFile: file.name }))
      let contributed = false
      for (const r of tagged) {
        const key = rowDedupeKey(r)
        if (!existIds.has(key)) {
          toAppend.push(r)
          existIds.add(key)
          contributed = true
        }
      }
      if (
        contributed &&
        !s0.uploadedFiles.includes(file.name) &&
        !newFileNames.includes(file.name)
      ) {
        newFileNames.push(file.name)
      }
    }

    if (!toAppend.length) return

    set((s) => {
      const merged = [...s.allData, ...toAppend]
      const uploadedFiles = [...new Set([...s.uploadedFiles, ...newFileNames])]
      const accountNames = computeAccountNames(merged)
      const selectedAccount = reconcileSelectedAccount(s.selectedAccount, accountNames)
      const domainFilter = ''
      const dateRangeStart = ''
      const dateRangeEnd = ''
      const origFilter = 'all' as OrigFilter
      const searchKeyword = ''
      return {
        allData: merged,
        uploadedFiles,
        hasData: merged.length > 0,
        accountNames,
        selectedAccount,
        domainFilter,
        dateRangeStart,
        dateRangeEnd,
        origFilter,
        searchKeyword,
        selectedTags: [],
        availableTags: computeAvailableTags(merged),
        filteredData: computeFiltered({
          allData: merged,
          selectedAccount,
          domainFilter,
          dateRangeStart,
          dateRangeEnd,
          origFilter,
          searchKeyword,
          selectedTags: [],
        }),
        comparisonData: computeComparisonFiltered({
          allData: merged,
          domainFilter,
          dateRangeStart,
          dateRangeEnd,
          origFilter,
          searchKeyword,
          selectedTags: [],
        }),
      }
    })
  },

  removeUploadedFile: (fileName) => {
    set((s) => {
      const allData = s.allData.filter((r) => r.sourceFile !== fileName)
      const uploadedFiles = s.uploadedFiles.filter((f) => f !== fileName)
      const accountNames = computeAccountNames(allData)
      const selectedAccount = reconcileSelectedAccount(s.selectedAccount, accountNames)
      let domainFilter = s.domainFilter
      const dateRangeStart = s.dateRangeStart
      const dateRangeEnd = s.dateRangeEnd
      if (domainFilter && !allData.some((r) => r.domain === domainFilter)) {
        domainFilter = ''
      }
      if (
        domainFilter &&
        selectedAccount &&
        !allData.some(
          (r) =>
            r.account === selectedAccount && r.domain === domainFilter,
        )
      ) {
        domainFilter = ''
      }
      // Remove selected tags that no longer exist
      const availableTags = computeAvailableTags(allData)
      const selectedTags = s.selectedTags.filter((t) => availableTags.includes(t))
      const p = makeFilterParams({ ...s, allData, selectedAccount, domainFilter, dateRangeStart, dateRangeEnd, selectedTags })
      return {
        allData,
        uploadedFiles,
        accountNames,
        selectedAccount,
        hasData: allData.length > 0,
        domainFilter,
        dateRangeStart,
        dateRangeEnd,
        selectedTags,
        availableTags,
        filteredData: computeFiltered(p),
        comparisonData: computeComparisonFiltered(p),
      }
    })
  },

  loadJsonFiles: async () => {
    const s0 = get()
    if (s0.allData.length > 0) return
    const rows = await loadAllJsonFiles()
    if (!rows.length) return
    const existIds = new Set<string>()
    const deduped: ArticleRow[] = []
    for (const r of rows) {
      const key = rowDedupeKey(r)
      if (!existIds.has(key)) {
        deduped.push(r)
        existIds.add(key)
      }
    }
    set((s) => {
      const merged = [...s.allData, ...deduped]
      const uploadedFiles = [
        ...new Set([
          ...s.uploadedFiles,
          ...JSON_FILES.filter((f) => !s.uploadedFiles.includes(f)),
        ]),
      ]
      const accountNames = computeAccountNames(merged)
      const selectedAccount = reconcileSelectedAccount(
        s.selectedAccount,
        accountNames,
      )
      return {
        allData: merged,
        uploadedFiles,
        hasData: merged.length > 0,
        accountNames,
        selectedAccount,
        selectedTags: [],
        availableTags: computeAvailableTags(merged),
        filteredData: computeFiltered({
          allData: merged,
          selectedAccount,
          domainFilter: '',
          dateRangeStart: '',
          dateRangeEnd: '',
          origFilter: 'all',
          searchKeyword: '',
          selectedTags: [],
        }),
        comparisonData: computeComparisonFiltered({
          allData: merged,
          domainFilter: '',
          dateRangeStart: '',
          dateRangeEnd: '',
          origFilter: 'all',
          searchKeyword: '',
          selectedTags: [],
        }),
      }
    })
  },

  reloadData: async () => {
    // Clear existing data and re-load from JSON files
    set({
      allData: [],
      filteredData: [],
      comparisonData: [],
      hasData: false,
      selectedTags: [],
      availableTags: [],
    })
    // Reset the guard in loadJsonFiles by clearing allData first, then load
    const rows = await loadAllJsonFiles()
    if (!rows.length) return
    const existIds = new Set<string>()
    const deduped: ArticleRow[] = []
    for (const r of rows) {
      const key = rowDedupeKey(r)
      if (!existIds.has(key)) {
        deduped.push(r)
        existIds.add(key)
      }
    }
    set((s) => {
      const merged = deduped
      const uploadedFiles = [
        ...new Set(JSON_FILES.filter((f) => !s.uploadedFiles.includes(f))),
      ]
      const accountNames = computeAccountNames(merged)
      const selectedAccount = reconcileSelectedAccount(s.selectedAccount, accountNames)
      return {
        allData: merged,
        uploadedFiles: [...new Set([...s.uploadedFiles, ...uploadedFiles])],
        hasData: merged.length > 0,
        accountNames,
        selectedAccount,
        selectedTags: s.selectedTags.filter((t) => computeAvailableTags(merged).includes(t)),
        availableTags: computeAvailableTags(merged),
        filteredData: computeFiltered({
          allData: merged,
          selectedAccount,
          domainFilter: s.domainFilter,
          dateRangeStart: s.dateRangeStart,
          dateRangeEnd: s.dateRangeEnd,
          origFilter: s.origFilter,
          searchKeyword: '',
          selectedTags: s.selectedTags.filter((t) => computeAvailableTags(merged).includes(t)),
        }),
        comparisonData: computeComparisonFiltered({
          allData: merged,
          domainFilter: s.domainFilter,
          dateRangeStart: s.dateRangeStart,
          dateRangeEnd: s.dateRangeEnd,
          origFilter: s.origFilter,
          searchKeyword: '',
          selectedTags: s.selectedTags.filter((t) => computeAvailableTags(merged).includes(t)),
        }),
      }
    })
  },

  setSelectedAccount: (name) => {
    const s = get()
    if (name !== '' && !s.accountNames.includes(name)) return
    const p = makeFilterParams({ ...s, selectedAccount: name, domainFilter: '', dateRangeStart: '', dateRangeEnd: '' })
    set({
      selectedAccount: name,
      domainFilter: '',
      dateRangeStart: '',
      dateRangeEnd: '',
      filteredData: computeFiltered(p),
      comparisonData: computeComparisonFiltered(p),
    })
  },

  setDomainFilter: (v) => {
    const s = get()
    const p = makeFilterParams({ ...s, domainFilter: v })
    set({
      domainFilter: v,
      filteredData: computeFiltered(p),
      comparisonData: computeComparisonFiltered(p),
    })
  },

  setDateRange: (start, end) => {
    const s = get()
    const p = makeFilterParams({ ...s, dateRangeStart: start, dateRangeEnd: end })
    set({
      dateRangeStart: start,
      dateRangeEnd: end,
      filteredData: computeFiltered(p),
      comparisonData: computeComparisonFiltered(p),
    })
  },

  setOrigFilter: (v) => {
    const s = get()
    const p = makeFilterParams({ ...s, origFilter: v })
    set({
      origFilter: v,
      filteredData: computeFiltered(p),
      comparisonData: computeComparisonFiltered(p),
    })
  },

  setSearchKeyword: (v) => {
    const s = get()
    const p = makeFilterParams({ ...s, searchKeyword: v })
    set({
      searchKeyword: v,
      filteredData: computeFiltered(p),
      comparisonData: computeComparisonFiltered(p),
    })
  },

  setAIContent: (key, content) => {
    set((s) => ({
      aiContent: { ...s.aiContent, [key]: content },
    }))
  },

  setSelectedTags: (tags) => {
    const s = get()
    const p = makeFilterParams({ ...s, selectedTags: tags })
    set({
      selectedTags: tags,
      filteredData: computeFiltered(p),
      comparisonData: computeComparisonFiltered(p),
    })
  },
}))

let persistSubscribed = false

export async function initDashboardPersistence(): Promise<void> {
  const snap = await loadDashboardSnapshot()
  if (snap && snap.allData.length > 0) {
    // Restore article tags from persistent storage
    if (snap.articleTags) {
      for (const r of snap.allData) {
        if (r.id != null && snap.articleTags[String(r.id)]) {
          r.tags = snap.articleTags[String(r.id)]
        }
      }
    }

    const accountNames = computeAccountNames(snap.allData)
    const selectedAccount = reconcileSelectedAccount(
      snap.selectedAccount,
      accountNames,
    )
    let domainFilter = snap.domainFilter
    if (
      domainFilter &&
      selectedAccount &&
      !snap.allData.some(
        (r) =>
          r.account === selectedAccount && r.domain === domainFilter,
      )
    ) {
      domainFilter = ''
    }

    const dateRangeStart = snap.dateRangeStart ?? ''
    const dateRangeEnd = snap.dateRangeEnd ?? ''

    const selectedTags = snap.selectedTags?.filter((t) =>
      computeAvailableTags(snap.allData).includes(t),
    ) ?? []
    const availableTags = computeAvailableTags(snap.allData)

    useDashboardStore.setState({
      allData: snap.allData,
      uploadedFiles: snap.uploadedFiles,
      accountNames,
      selectedAccount,
      domainFilter,
      dateRangeStart,
      dateRangeEnd,
      origFilter: snap.origFilter,
      searchKeyword: '',
      hasData: snap.allData.length > 0,
      aiContent: snap.aiContent ?? {},
      selectedTags,
      availableTags,
      filteredData: computeFiltered({
        allData: snap.allData,
        selectedAccount,
        domainFilter,
        dateRangeStart,
        dateRangeEnd,
        origFilter: snap.origFilter,
        searchKeyword: '',
        selectedTags,
      }),
      comparisonData: computeComparisonFiltered({
        allData: snap.allData,
        domainFilter,
        dateRangeStart,
        dateRangeEnd,
        origFilter: snap.origFilter,
        searchKeyword: '',
        selectedTags,
      }),
    })
  } else {
    void useDashboardStore.getState().loadJsonFiles()
  }
  if (!persistSubscribed) {
    persistSubscribed = true
    useDashboardStore.subscribe((state) => {
      debouncedSaveDashboard(toSnapshot(state))
    })
  }
}
