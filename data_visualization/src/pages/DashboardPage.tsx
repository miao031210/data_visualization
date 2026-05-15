import { ChartBarAccounts } from '../components/charts/ChartBarAccounts'
import { ChartCard } from '../components/charts/ChartCard'
import { ChartEfficiency } from '../components/charts/ChartEfficiency'
import { ChartMonthlyTrends } from '../components/charts/ChartMonthlyTrends'
import { ChartPositionAnalysis } from '../components/charts/ChartPositionAnalysis'
import { ChartScatter } from '../components/charts/ChartScatter'
import { DashboardHeader } from '../components/dashboard/DashboardHeader'
import { FileUploadZone } from '../components/dashboard/FileUploadZone'
import { FilterBar } from '../components/dashboard/FilterBar'
import { KpiRow } from '../components/dashboard/KpiRow'
import { Top10Table } from '../components/dashboard/Top10Table'
import { useDashboardStore } from '../store/dashboardStore'

export function DashboardPage() {
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)
  const isAllAccounts = selectedAccount === ''

  return (
    <div className="relative min-h-screen bg-slate-50 text-slate-800">
      <div
        className="pointer-events-none fixed inset-0 bg-[linear-gradient(rgba(148,163,184,0.07)_1px,transparent_1px),linear-gradient(90deg,rgba(148,163,184,0.07)_1px,transparent_1px)] bg-[size:40px_40px]"
        aria-hidden
      />
      <div className="relative z-[1] mx-auto max-w-[1600px] px-3 py-6 sm:px-6">
        <DashboardHeader />
        <FileUploadZone />
        <FilterBar />
        <KpiRow />

        <div className="mb-3.5 grid min-w-0 grid-cols-1 gap-3.5 xl:grid-cols-2 xl:items-stretch">
          <div className="flex min-w-0 flex-col gap-3.5">
            <ChartCard
              title={
                isAllAccounts
                  ? '各公众号发文数量（原创 vs 转载）'
                  : '发文数量（原创 vs 转载）'
              }
              badge="构成"
              subtitle={
                isAllAccounts
                  ? '堆叠柱 · 柱顶原创占比 · 下表为篇均与互动率'
                  : '饼图 · 标注篇数与占比 · 下表为篇均与互动率'
              }
            >
              <ChartBarAccounts />
            </ChartCard>
            <ChartCard
              title={isAllAccounts ? '各账号互动效率' : '互动效率'}
              badge="效率"
              subtitle={isAllAccounts ? '三账号 · 每千次阅读 · 表 · 周趋势' : '当前号 · 每千次阅读 · 表 · 周趋势'}
            >
              <ChartEfficiency height={220} />
            </ChartCard>
          </div>
          <ChartCard
            title="月度发文 & 阅读 & 互动趋势"
            badge="时序"
            subtitle="按月聚合 · 剔除不完整当月 · 环比见表"
            className="min-h-0"
          >
            <ChartMonthlyTrends chartHeight={isAllAccounts ? 268 : 250} />
          </ChartCard>
        </div>

        <div className="mb-3.5 min-w-0">
          <ChartCard
            title="阅读量 vs 在看数"
            badge="相关"
            subtitle={
              isAllAccounts
                ? '同图多账号分色 · 气泡∝√分享数'
                : '当前公众号 · 气泡∝√分享数'
            }
          >
            <ChartScatter height={400} />
          </ChartCard>
        </div>

        <div className="mb-3.5 min-w-0">
          <ChartCard
            title="发布位置效果"
            badge="位置"
            subtitle="位置结构饼图 · 篇均阅读与平均互动率柱状对比"
          >
            <ChartPositionAnalysis />
          </ChartCard>
        </div>

        <Top10Table />

        <footer className="mt-2 border-t border-slate-200 py-5 text-center text-[11px] text-slate-400">
          数据来源：JSON / Excel 文件 · 仪表盘实时计算 · 更新文件后重新上传即可刷新
        </footer>
      </div>
    </div>
  )
}
