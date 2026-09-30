export type NoteBlock = {
  kind: 'heading' | 'body' | 'bullet' | 'number'
  indent: number
  text: string
  marker?: string
  bold?: boolean
}

export function parseNote(value: string): NoteBlock[] {
  return value.split('\n').map((line) => {
    const indent = line.match(/^\t*/)?.[0].length ?? 0
    const content = line.slice(indent)
    const withBold = (text: string) => {
      const bold = text.length >= 4 && text.startsWith('**') && text.endsWith('**')
      return { text: bold ? text.slice(2, -2) : text, bold }
    }
    if (content.startsWith('# '))
      return { kind: 'heading', indent, ...withBold(content.slice(2)), marker: '# ' }
    if (content.startsWith('- ') || content.startsWith('• '))
      return { kind: 'bullet', indent, ...withBold(content.slice(2)), marker: content.slice(0, 2) }
    const numbered = content.match(/^\d+\. /)
    if (numbered)
      return {
        kind: 'number',
        indent,
        ...withBold(content.slice(numbered[0].length)),
        marker: numbered[0]
      }
    return { kind: 'body', indent, ...withBold(content) }
  })
}

export function serializeNote(blocks: NoteBlock[]): string {
  let number = 0
  return blocks
    .map((block) => {
      number = block.kind === 'number' ? number + 1 : 0
      const marker =
        block.marker ??
        (block.kind === 'heading'
          ? '# '
          : block.kind === 'bullet'
            ? '- '
            : block.kind === 'number'
              ? `${number}. `
              : '')
      return `${'\t'.repeat(block.indent)}${marker}${block.bold ? `**${block.text}**` : block.text}`
    })
    .join('\n')
}

export function plainNote(value: string): string {
  return parseNote(value)
    .map((block) => {
      const prefix =
        block.kind === 'bullet' ? '• ' : block.kind === 'number' ? (block.marker ?? '1. ') : ''
      return `${'  '.repeat(Math.min(2, block.indent))}${prefix}${block.text}`
    })
    .join('\n')
}
