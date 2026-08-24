const EDITABLE_TAGS = new Set(['INPUT', 'TEXTAREA', 'SELECT'])

export const shouldHandleDeleteShortcut = (
  key: string,
  targetTagName: string,
  isContentEditable: boolean,
  hasDeleteAction: boolean
) => key === 'Delete' && hasDeleteAction && !EDITABLE_TAGS.has(targetTagName) && !isContentEditable
