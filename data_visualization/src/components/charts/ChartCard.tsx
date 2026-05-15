import type { ReactNode } from 'react'

interface ChartCardProps {
  title: string
  badge?: string
  subtitle: string
  children: ReactNode
  className?: string
}

export function ChartCard({
  title,
  badge,
  subtitle,
  children,
  className = '',
}: ChartCardProps) {
  return (
    <div
      className={`rounded-xl border border-slate-200 bg-white p-4 pb-3 shadow-sm ${className}`}
    >
      <div className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-800">
        {title}
        {badge ? (
          <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-normal text-blue-600">
            {badge}
          </span>
        ) : null}
      </div>
      <p className="mb-3 text-[11px] text-slate-400">{subtitle}</p>
      <div className="min-w-0 min-h-0 flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
