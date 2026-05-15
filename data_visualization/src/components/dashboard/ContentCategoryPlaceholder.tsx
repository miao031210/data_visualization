export function ContentCategoryPlaceholder() {
  return (
    <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/80 p-6 text-sm text-slate-600">
      <p className="font-medium text-slate-800">内容主题分析（待接入）</p>
      <p className="mt-2 text-xs leading-relaxed text-slate-500">
        统计「疾病科普、患者故事、新药进展」等内容维度需要在 Excel
        中增加规范化的「内容主题」列并由运营逐篇标注。当前未启用该列，此处预留；上线后可在此展示各号分类发文占比、分类带来的阅读量及互动率对比。
      </p>
    </div>
  )
}
