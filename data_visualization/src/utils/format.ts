export function fmt(n: number): string {
  if (n >= 10000) return `${(n / 10000).toFixed(1)}w`
  if (n >= 1000) return `${(n / 1000).toFixed(1)}k`
  return n.toLocaleString()
}

export function fmtPct(n: number): string {
  return `${(n * 100).toFixed(1)}%`
}
