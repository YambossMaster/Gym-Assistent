import { describe, expect, it } from 'vitest'
import { parseNote, plainNote, serializeNote } from './note-format'

describe('mobile note formatting', () => {
  it('keeps plain notes and interprets headings, lists, and indentation', () => {
    const note = '課後觀察\n# 下次安排\n- 深蹲\n1. 熱身\n2. 正式組\n\t補充'
    expect(parseNote(note).map(({ kind, indent }) => [kind, indent])).toEqual([
      ['body', 0],
      ['heading', 0],
      ['bullet', 0],
      ['number', 0],
      ['number', 0],
      ['body', 1]
    ])
    expect(serializeNote(parseNote(note))).toBe(note)
  })

  it('renumbers a numbered run after a different block', () => {
    expect(
      serializeNote([
        { kind: 'number', indent: 0, text: '一' },
        { kind: 'body', indent: 0, text: '中斷' },
        { kind: 'number', indent: 0, text: '重新開始' }
      ])
    ).toBe('1. 一\n中斷\n1. 重新開始')
  })

  it('does not rewrite existing bullets, numbering, or deeper tab spacing', () => {
    const existing = '• 原有項目\n9. 原有編號\n\t\t\t保留縮排'
    expect(serializeNote(parseNote(existing))).toBe(existing)
  })

  it('provides clean text for a shared result image', () => {
    expect(plainNote('# 標題\n- 重點\n1. 第一項')).toBe('標題\n• 重點\n1. 第一項')
  })

  it('keeps paragraph bold readable across save and display', () => {
    const note = '一般\n- **重要**\n# **下次安排**'
    expect(serializeNote(parseNote(note))).toBe(note)
    expect(parseNote(note)[1]).toMatchObject({ kind: 'bullet', text: '重要', bold: true })
    expect(plainNote(note)).toBe('一般\n• 重要\n下次安排')
  })
})
