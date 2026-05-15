import { useCallback, useId, useState } from 'react'
import { useDashboardStore } from '../../store/dashboardStore'

const INPUT_ID = 'dashboard-excel-file-input'

export function FileUploadZone() {
  const addFiles = useDashboardStore((s) => s.addFiles)
  const removeUploadedFile = useDashboardStore((s) => s.removeUploadedFile)
  const uploadedFiles = useDashboardStore((s) => s.uploadedFiles)
  const [dragOver, setDragOver] = useState(false)
  const reactId = useId()
  const inputId = `${INPUT_ID}-${reactId.replace(/:/g, '')}`

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files?.length) return
      await addFiles(files)
    },
    [addFiles],
  )

  return (
    <div className="mb-5 flex flex-wrap items-start gap-3">
      <div
        onDragOver={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(true)
        }}
        onDragLeave={(e) => {
          e.preventDefault()
          setDragOver(false)
        }}
        onDrop={(e) => {
          e.preventDefault()
          e.stopPropagation()
          setDragOver(false)
          void handleFiles(e.dataTransfer.files)
        }}
        className={`relative flex min-w-[300px] flex-1 rounded-[10px] border border-dashed transition-colors ${
          dragOver
            ? 'border-emerald-400 bg-emerald-50'
            : 'border-slate-200 bg-white hover:border-blue-400 hover:bg-blue-50/50'
        }`}
      >
        <input
          id={inputId}
          type="file"
          accept=".xlsx,.xls,.csv,.json"
          multiple
          className="sr-only"
          onChange={(e) => {
            void handleFiles(e.target.files)
            e.target.value = ''
          }}
        />
        <label
          htmlFor={inputId}
          className="flex w-full cursor-pointer items-center gap-3.5 px-5 py-4"
        >
          <span className="text-2xl" aria-hidden>
            📂
          </span>
          <div className="min-w-0 flex-1">
            <strong className="block text-sm text-slate-800">
              上传数据文件（Excel / JSON）
            </strong>
            <span className="text-xs text-slate-500">
              支持多文件同时上传 · 拖拽或点击选择 · .xlsx / .xls / .csv / .json
            </span>
          </div>
        </label>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {uploadedFiles.map((name) => (
          <span
            key={name}
            className="relative inline-flex max-w-[220px] items-center rounded-md border border-emerald-200 bg-slate-50 pr-6 pl-2.5 pt-2 pb-1.5 font-mono text-[11px] text-emerald-800"
          >
            <span className="break-all">✓ {name}</span>
            <button
              type="button"
              title={`移除 ${name}`}
              className="absolute right-0.5 top-0.5 flex h-5 w-5 items-center justify-center rounded text-slate-400 transition hover:bg-slate-200 hover:text-slate-700"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                removeUploadedFile(name)
              }}
              aria-label={`移除文件 ${name}`}
            >
              ×
            </button>
          </span>
        ))}
      </div>
    </div>
  )
}
