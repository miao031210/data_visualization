import { useMemo } from 'react'
import { COLORS } from '../../constants/dashboard'
import { accountStats } from '../../utils/metrics'
import { useDashboardStore } from '../../store/dashboardStore'
import { AIAnalysisCard } from './AIAnalysisCard'
export function KpiRow() {
  const comparisonData = useDashboardStore((s) => s.comparisonData)
  const filteredData = useDashboardStore((s) => s.filteredData)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)

  const isAllAccounts = selectedAccount === ''

  const columns = useMemo(() => {
    const accs = [
      ...new Set(comparisonData.map((r) => r.account).filter(Boolean)),
    ].sort() as string[]
    return accs.map((account, i) => {
      const rows = comparisonData.filter((r) => r.account === account)
      const st = accountStats(rows)
      const color = COLORS[i % COLORS.length]
      return { account, color, ...st }
    })
  }, [comparisonData])

  const singleColumn = useMemo(() => {
    if (!filteredData.length || !selectedAccount) return null
    const st = accountStats(filteredData)
    const color = COLORS[0]
    return { account: selectedAccount, color, ...st }
  }, [filteredData, selectedAccount])

  return (
    <>
      {/* Row 1: Core Metrics (1fr) + AI Analysis (2fr) */}
      <div className="mb-5 grid grid-cols-1 gap-4 lg:grid-cols-[1fr_2fr] lg:items-stretch lg:gap-6">
        {/* Core metrics card */}
        <section className="flex flex-col rounded-xl border border-slate-200 bg-white shadow-sm h-[500px]">
          <div className="shrink-0 border-b border-slate-100 px-4 py-2.5">
            <p className="text-[10px] font-medium uppercase tracking-wider text-slate-400">
              核心指标（按公众号）
            </p>
          </div>

          {isAllAccounts ? (
            !columns.length ? (
              <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-400">
                上传数据后按账号展示
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto px-3 py-2 space-y-2">
                {columns.map((col) => (
                  <div
                    key={col.account}
                    className="rounded-lg border border-slate-100 bg-slate-50/50 p-3"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <span
                        className="inline-block h-2.5 w-1 shrink-0 rounded-full"
                        style={{ backgroundColor: col.color }}
                      />
                      <span className="text-[13px] font-semibold text-slate-800 truncate">
                        {col.account}
                      </span>
                    </div>
                    <div className="grid grid-cols-3 gap-x-2.5 gap-y-1">
                      <div>
                        <div className="text-[10px] text-slate-400">文章数</div>
                        <div className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">
                          {col.display.count}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">阅读总量</div>
                        <div className="font-mono text-[13px] font-semibold tabular-nums text-slate-900">
                          {col.display.reads}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">篇均阅读</div>
                        <div className="font-mono text-[13px] font-semibold tabular-nums text-slate-800">
                          {col.display.avgRead}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">原创率</div>
                        <div className="font-mono text-[13px] font-semibold tabular-nums text-slate-800">
                          {col.display.origRate}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">互动/千读</div>
                        <div className="font-mono text-[13px] font-semibold tabular-nums text-slate-800">
                          {col.display.interactionsPer1k}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400">互动率</div>
                        <div className="font-mono text-[13px] font-semibold tabular-nums text-slate-800">
                          {col.display.avgInteractionRate}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : !singleColumn ? (
            <div className="flex flex-1 items-center justify-center text-center text-sm text-slate-400">
              请选择公众号或上传数据
            </div>
          ) : (
            <div className="flex-1 min-h-0 flex flex-col px-5 py-5">
              <div className="flex items-center gap-2 mb-5">
                <span
                  className="inline-block h-3 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: singleColumn.color }}
                />
                <span className="text-sm font-semibold text-slate-800 truncate">
                  {singleColumn.account}
                </span>
              </div>
              <div className="flex-1 grid grid-cols-2 gap-4">
                {([
                  { label: '文章数', value: singleColumn.display.count, accent: true },
                  { label: '阅读总量', value: singleColumn.display.reads, accent: true },
                  { label: '篇均阅读', value: singleColumn.display.avgRead },
                  { label: '原创率', value: singleColumn.display.origRate },
                  { label: '互动/千读', value: singleColumn.display.interactionsPer1k },
                  { label: '互动率', value: singleColumn.display.avgInteractionRate },
                ] as const).map(({ label, value, accent }) => (
                  <div
                    key={label}
                    className="flex flex-col justify-center rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-3"
                  >
                    <div className="text-[10px] text-slate-400 uppercase tracking-wider">
                      {label}
                    </div>
                    <div
                      className={`mt-1.5 font-mono text-3xl font-bold tabular-nums ${
                        accent ? 'text-slate-900' : 'text-slate-700'
                      }`}
                    >
                      {value}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="shrink-0 border-t border-slate-100 px-3 py-2 text-[10px] leading-relaxed text-slate-400">
            互动/千读 = Σ(点赞+分享+在看)/Σ(阅读)×1000，优先用于排序和趋势分析。
          </p>
        </section>

        <AIAnalysisCard />
      </div>

    </>
  )
}
