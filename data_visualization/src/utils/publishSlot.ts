export type PublishSlot = '头条' | '次条' | '第三条' | '第四条' | '其他'

/** 将导出表中的「发布位置」规范为头条 / 次条 / 第三条 / 第四条 / 其他 */
export function normalizePublishSlot(raw: string | undefined): PublishSlot {
  if (raw == null) return '其他'
  const cn = String(raw).trim()
  if (!cn) return '其他'
  const s = cn.toLowerCase()

  if (/^(1|①|１)$/.test(cn) || /^第?\s*1\s*条?$/.test(cn)) return '头条'
  if (/^(2|②|２)$/.test(cn) || /^第?\s*2\s*条?$/.test(cn)) return '次条'
  if (/^(3|③|３)$/.test(cn) || /^第?\s*3\s*条?$/.test(cn)) return '第三条'
  if (/^(4|④|４)$/.test(cn) || /^第?\s*4\s*条?$/.test(cn)) return '第四条'
  if (/^(5|6|7|8|9|[⑤-⑨])$/.test(cn)) return '其他'

  if (/头条|首条|第一条/.test(cn)) return '头条'
  if (/次条|第二条/.test(cn)) return '次条'
  if (/第三条/.test(cn)) return '第三条'
  if (/第四条/.test(cn)) return '第四条'
  if (/第五条|第\s*[5-9]\s*条|其余|其它|其他条/.test(cn)) return '其他'

  if (/^second|^2nd|^sub/i.test(s)) return '次条'
  if (/^third|^3rd/i.test(s)) return '第三条'
  if (/^fourth|^4th/i.test(s)) return '第四条'
  if (/^head|^first|^top|^1st/i.test(s)) return '头条'

  return '其他'
}

export type SlotOrMissing = PublishSlot | '未标注'

export function publishSlotOrMissing(raw: string | undefined): SlotOrMissing {
  if (raw == null || !String(raw).trim()) return '未标注'
  return normalizePublishSlot(raw)
}
