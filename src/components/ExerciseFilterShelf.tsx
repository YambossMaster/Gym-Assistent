import { Check, ChevronDown, RotateCcw, SlidersHorizontal } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'

type ExerciseFilterShelfProps = {
  equipmentTags: string[]
  bodyPartTags: string[]
  equipment: string
  onEquipmentChange: (value: string) => void
  bodyParts: string[]
  onBodyPartsChange: (value: string[]) => void
  movementType: string
  onMovementTypeChange: (value: string) => void
  compact?: boolean
}

export function ExerciseFilterShelf({
  equipmentTags,
  bodyPartTags,
  equipment,
  onEquipmentChange,
  bodyParts,
  onBodyPartsChange,
  movementType,
  onMovementTypeChange,
  compact = false
}: ExerciseFilterShelfProps) {
  const shelfRef = useRef<HTMLElement | null>(null)
  const [expanded, setExpanded] = useState(false)
  const activeCount =
    (equipment === '全部' ? 0 : 1) + bodyParts.length + (movementType === '全部' ? 0 : 1)
  const selectedLabels = [
    equipment !== '全部' ? equipment : null,
    ...bodyParts,
    movementType !== '全部' ? movementType : null
  ].filter(Boolean) as string[]
  const reset = () => {
    onEquipmentChange('全部')
    onBodyPartsChange([])
    onMovementTypeChange('全部')
  }
  const toggleBodyPart = (part: string) =>
    onBodyPartsChange(
      bodyParts.includes(part) ? bodyParts.filter((value) => value !== part) : [...bodyParts, part]
    )

  useEffect(() => {
    if (!expanded) return
    const handleOutside = (event: PointerEvent) => {
      if (!shelfRef.current?.contains(event.target as Node)) setExpanded(false)
    }
    document.addEventListener('pointerdown', handleOutside)
    return () => document.removeEventListener('pointerdown', handleOutside)
  }, [expanded])

  return (
    <section
      ref={shelfRef}
      className={`filter-shelf ${expanded ? 'is-open' : ''} ${compact ? 'compact' : ''}`}
    >
      <button
        type="button"
        className="filter-shelf-toggle"
        onClick={() => setExpanded((value) => !value)}
        aria-expanded={expanded}
      >
        <span className="filter-toggle-icon">
          <SlidersHorizontal />
        </span>
        <span className="filter-toggle-copy">
          <strong>快速標籤篩選</strong>
          <small>{activeCount ? `已選 ${activeCount} 個條件` : '器材、部位與類型一次展開'}</small>
        </span>
        {!expanded && selectedLabels.length > 0 && (
          <span className="filter-selection-preview">
            {selectedLabels.slice(0, 3).map((label) => (
              <i key={label}>{label}</i>
            ))}
            {selectedLabels.length > 3 && <i>+{selectedLabels.length - 3}</i>}
          </span>
        )}
        <ChevronDown className="filter-chevron" />
      </button>
      {expanded && (
        <div className="filter-shelf-panel">
          <div className="filter-panel-head">
            <div>
              <span className="eyebrow">ALL FILTERS</span>
              <strong>直接點選，不用逐一下拉尋找</strong>
            </div>
            <button
              type="button"
              className="clear-filter-button"
              onClick={reset}
              disabled={!activeCount}
            >
              <RotateCcw />
              清除標籤
            </button>
          </div>
          <div className="filter-group">
            <div className="filter-group-title">
              <strong>器材</strong>
              <span>單選</span>
            </div>
            <div className="filter-chip-cloud">
              <button
                type="button"
                className={equipment === '全部' ? 'filter-chip selected' : 'filter-chip'}
                onClick={() => onEquipmentChange('全部')}
              >
                全部
              </button>
              {equipmentTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={equipment === tag ? 'filter-chip selected' : 'filter-chip'}
                  onClick={() => onEquipmentChange(tag)}
                >
                  {equipment === tag && <Check />}
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-group-title">
              <strong>部位</strong>
              <span>可複選・同時包含全部所選部位</span>
            </div>
            <div className="filter-chip-cloud">
              <button
                type="button"
                className={bodyParts.length === 0 ? 'filter-chip selected' : 'filter-chip'}
                onClick={() => onBodyPartsChange([])}
              >
                全部
              </button>
              {bodyPartTags.map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={bodyParts.includes(tag) ? 'filter-chip selected' : 'filter-chip'}
                  onClick={() => toggleBodyPart(tag)}
                >
                  {bodyParts.includes(tag) && <Check />}
                  {tag}
                </button>
              ))}
            </div>
          </div>
          <div className="filter-group">
            <div className="filter-group-title">
              <strong>動作類型</strong>
              <span>單選</span>
            </div>
            <div className="filter-chip-cloud">
              {['全部', '系統動作', '局部動作'].map((tag) => (
                <button
                  type="button"
                  key={tag}
                  className={movementType === tag ? 'filter-chip selected' : 'filter-chip'}
                  onClick={() => onMovementTypeChange(tag)}
                >
                  {movementType === tag && tag !== '全部' && <Check />}
                  {tag}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </section>
  )
}
