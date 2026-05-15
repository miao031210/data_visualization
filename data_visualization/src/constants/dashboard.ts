export const COLORS = [
  '#4f8ef7',
  '#36d9a4',
  '#f7884f',
  '#c97af5',
  '#f7d44f',
  '#f75f7a',
  '#4fd9f7',
] as const

export const EMPTY_MSG = '上传数据后显示'

/** Excel 列名 → 内部字段 */
export const COL_MAP: Record<string, string> = {
    文章编号: 'id',
    公众号: 'account',
    账号: 'accountId',
    作者: 'author',
    发布位置: 'position',
    '是否原创(1:是,0:否)': 'original',
    标题: 'title',
    摘要: 'summary',
    文章链接: 'url',
    阅读数: 'reads',
    在看数: 'sees',
    点赞数: 'likes',
    分享数: 'shares',
    发布时间: 'publishTime',
    '发布时间(年月)': 'publishMonth',
    公众号类型: 'accountType',
    领域: 'domain',
    文章标识: 'articleTag',
  }
