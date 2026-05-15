import { useMemo } from 'react'
import { COLORS } from '../../constants/dashboard'
import type { OrigFilter } from '../../types/filters'
import { useDashboardStore } from '../../store/dashboardStore'
import { TagBar } from './TagBar'
import { MonthRangePicker } from './MonthRangePicker'

export function FilterBar() {
  const hasData = useDashboardStore((s) => s.hasData)
  const allData = useDashboardStore((s) => s.allData)
  const accountNames = useDashboardStore((s) => s.accountNames)
  const selectedAccount = useDashboardStore((s) => s.selectedAccount)
  const dateRangeStart = useDashboardStore((s) => s.dateRangeStart)
  const dateRangeEnd = useDashboardStore((s) => s.dateRangeEnd)
  const origFilter = useDashboardStore((s) => s.origFilter)
  const setSelectedAccount = useDashboardStore((s) => s.setSelectedAccount)
  const setDateRange = useDashboardStore((s) => s.setDateRange)
  const setOrigFilter = useDashboardStore((s) => s.setOrigFilter)

  const rowsOfAccount = useMemo(
    () =>
      selectedAccount
        ? allData.filter((r) => r.account === selectedAccount)
        : allData,
    [allData, selectedAccount],
  )

  const months = useMemo(
    () =>
      [...new Set(rowsOfAccount.map((r) => r.publishMonth).filter(Boolean))].sort() as string[],
    [rowsOfAccount],
  )

  if (!hasData) return null

  return (
    <div className="mb-5 space-y-2">
    <p className="text-[11px] leading-relaxed text-slate-500">
      顶栏「公众号」仅影响下方明细表、单号原创对比等；核心 KPI、发文堆叠与月度趋势等为<strong className="font-medium text-slate-600">三账号同框对比</strong>
      （仍受时间 / 原创 / 标签筛选影响）。
    </p>
    <TagBar />
    <div className="flex flex-wrap items-center gap-2.5 text-sm">
      <span className="text-xs text-slate-500">公众号：</span>
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="选择要查看的公众号"
      >
        <button
          type="button"
          role="radio"
          aria-checked={selectedAccount === ''}
          onClick={() => setSelectedAccount('')}
          className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
            selectedAccount === ''
              ? 'border-slate-600 bg-slate-100 text-slate-700'
              : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-slate-800'
          }`}
        >
          全部账号
        </button>
        {accountNames.map((name, i) => {
          const active = selectedAccount === name
          return (
            <button
              key={name}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => setSelectedAccount(name)}
              className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-600'
                  : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300 hover:text-slate-800'
              }`}
              style={
                active
                  ? {
                      borderColor: COLORS[i % COLORS.length],
                      color: COLORS[i % COLORS.length],
                      backgroundColor: `${COLORS[i % COLORS.length]}18`,
                    }
                  : undefined
              }
            >
              {name}
            </button>
          )
        })}
      </div>
      <div className="hidden h-6 w-px bg-slate-200 sm:block" />
      <span className="text-xs text-slate-500">时间：</span>
      <MonthRangePicker
        months={months}
        start={dateRangeStart}
        end={dateRangeEnd}
        onChange={setDateRange}
      />
      <div className="hidden h-6 w-px bg-slate-200 sm:block" />
      <span className="text-xs text-slate-500">原创：</span>
      <div className="flex gap-2">
        {(
          [
            { key: 'all' as OrigFilter, label: '全部', id: 'origAll' },
            { key: '1' as OrigFilter, label: '原创', id: 'orig1' },
            { key: '0' as OrigFilter, label: '转载', id: 'orig0' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setOrigFilter(key)}
            className={`rounded-full border px-3.5 py-1.5 text-xs transition-colors ${
              origFilter === key
                ? 'border-blue-500 bg-blue-50 text-blue-600'
                : 'border-slate-200 bg-white text-slate-500 hover:border-blue-300'
            }`}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
    </div>
  )
}
