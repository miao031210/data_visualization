import { useCallback, useState } from 'react'
import * as XLSX from 'xlsx'
import { useDashboardStore } from '../../store/dashboardStore'
import { API_BASE } from '../../services/apiConfig'

export function DashboardHeader() {
  const hasData = useDashboardStore((s) => s.hasData)
  const total = useDashboardStore((s) => s.allData.length)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)
  const filteredCount = useDashboardStore((s) => s.filteredData.length)
  const filteredData = useDashboardStore((s) => s.filteredData)
  const reloadData = useDashboardStore((s) => s.reloadData)

  const [updating, setUpdating] = useState(false)
  const [updateMsg, setUpdateMsg] = useState('')

  const handleExport = useCallback(() => {
    if (!filteredData.length) return
    const exportRows = filteredData.map((r) => ({
      '文章编号': r.id ?? '',
      '公众号': r.account,
      '账号': r.accountId ?? '',
      '作者': r.author ?? '',
      '发布位置': r.position ?? '',
      '是否原创': r.original,
      '标题': r.title ?? '',
      '摘要': r.summary ?? '',
      '文章链接': r.url ?? '',
      '阅读数': r.reads,
      '在看数': r.sees,
      '点赞数': r.likes,
      '分享数': r.shares,
      '发布时间': r.publishTime ?? '',
      '发布时间(年月)': r.publishMonth ?? '',
      '公众号类型': r.accountType ?? '',
      '领域': r.domain ?? '',
      '文章标识': r.articleTag ?? '',
    }))
    const ws = XLSX.utils.json_to_sheet(exportRows)
    const wb = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(wb, ws, '数据')
    const label = selectedAccount || '全部账号'
    XLSX.writeFile(wb, `公众号数据导出_${label}.xlsx`)
  }, [filteredData, selectedAccount])

  const handleUpdate = useCallback(async () => {
    setUpdating(true)
    setUpdateMsg('正在获取最新数据...')
    try {
      const resp = await fetch(`${API_BASE}/api/update-data`, { method: 'POST' })
      const data = await resp.json()
      if (data.success) {
        const parts: string[] = []
        for (const [acc, r] of Object.entries(data.results) as [string, { updated?: number; added?: number; error?: string; fetched?: number }][]) {
          if (r.error) {
            parts.push(`${acc}: ❌ ${r.error}`)
          } else {
            parts.push(`${acc}: 更新${r.updated ?? 0}篇, 新增${r.added ?? 0}篇`)
          }
        }
        setUpdateMsg(`完成！${parts.join('；')}`)
        // Reload frontend data
        await reloadData()
      } else {
        setUpdateMsg('更新失败')
      }
    } catch (e) {
      setUpdateMsg(`请求失败: ${e instanceof Error ? e.message : '未知错误'}`)
    }
    setTimeout(() => {
      setUpdating(false)
      setUpdateMsg('')
    }, 5000)
  }, [reloadData])

  return (
    <header className="mb-6 flex flex-col gap-4 border-b border-slate-200 pb-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <h1 className="bg-gradient-to-r from-blue-600 to-emerald-500 bg-clip-text text-xl font-bold tracking-wide text-transparent">
          微信公众号数据分析仪表盘
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          多文件合并入库 · 支持单账号分析 & 多账号对比
        </p>
      </div>
      <div className="flex items-center gap-3 text-sm text-slate-500">
        {updateMsg && (
          <span className="text-[11px] text-slate-500 max-w-[300px] truncate">{updateMsg}</span>
        )}
        <span
          className={`h-2 w-2 rounded-full ${hasData ? 'animate-pulse bg-emerald-500 shadow-[0_0_8px_#34d399]' : 'bg-slate-300'}`}
          aria-hidden
        />
        <span className="hidden sm:inline">
          {hasData
            ? `共 ${total.toLocaleString()} 条${
                selectedAccount
                  ? ` · ${selectedAccount}（${filteredCount.toLocaleString()} 条）`
                  : ' · 全部账号'
              }`
            : '等待数据上传'}
        </span>
        {hasData && (
          <>
            <button
              type="button"
              onClick={handleUpdate}
              disabled={updating}
              className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                updating
                  ? 'border-slate-200 bg-slate-100 text-slate-400 cursor-not-allowed'
                  : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {updating ? '⏳ 更新中...' : '🔄 更新数据'}
            </button>
            <button
              type="button"
              onClick={handleExport}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:border-blue-300 hover:bg-blue-50 hover:text-blue-600"
            >
              📥 导出 Excel
            </button>
          </>
        )}
      </div>
    </header>
  )
}
