import type { PublicTrainingResult } from '../../api'
import { formatMeasurements } from '../training/recording'

const INK = '#151711'
const PAPER = '#fbfaf5'
const SOFT = '#f2f0e9'
const MUTED = '#66695f'
const LIME = '#d9ff43'
const FONT = "'Noto Sans TC', sans-serif"

type Exercise = PublicTrainingResult['exercises'][number]

export async function createTrainingResultImage(
  result: PublicTrainingResult,
  sessionLabel: string
): Promise<Blob> {
  await document.fonts.ready
  const logo = await loadLogo()
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  if (!context) throw new Error('canvas unavailable')

  canvas.width = 1080
  context.font = `700 56px ${FONT}`
  const titleLines = wrapLines(context, `${result.studentDisplayName} 的訓練結果`, 880)
  const sections = result.exercises.map((exercise) => {
    context.font = `700 42px ${FONT}`
    return { exercise, nameLines: wrapLines(context, exercise.definitionName, 790) }
  })
  const noteLines =
    result.trainingNote === undefined
      ? []
      : (() => {
          context.font = `400 32px ${FONT}`
          return wrapLines(context, result.trainingNote || '—', 810)
        })()

  const cardTop = 190
  const titleBaseline = 332
  const dateBaseline = titleBaseline + titleLines.length * 66 + 18
  const coachBaseline = dateBaseline + 58
  const dividerY = coachBaseline + 42
  let contentY = dividerY + 30
  if (sections.length === 0) contentY += 240
  for (const { exercise, nameLines } of sections) {
    contentY += 70 + (nameLines.length - 1) * 52 + exercise.sets.length * 80 + 32
  }
  const noteTop = contentY + 8
  const noteHeight = noteLines.length ? 76 + noteLines.length * 48 : 0
  const cardBottom = Math.max(1830, noteTop + noteHeight + 80)
  canvas.height = Math.max(1920, cardBottom + 90)

  context.fillStyle = INK
  context.fillRect(0, 0, canvas.width, canvas.height)
  const logoWidth = 300
  context.drawImage(logo, 68, 56, logoWidth, (logo.height / logo.width) * logoWidth)
  context.fillStyle = '#c3c6b8'
  context.textAlign = 'right'
  context.font = `700 23px ${FONT}`
  context.fillText('TRAINING RESULT', 1010, 100)
  context.textAlign = 'left'

  fillRoundedRect(context, 48, cardTop, 984, cardBottom - cardTop, 28, PAPER)
  context.fillStyle = MUTED
  context.font = `700 25px ${FONT}`
  context.fillText('訓練紀錄', 96, 266)
  context.fillStyle = INK
  context.font = `700 56px ${FONT}`
  titleLines.forEach((line, index) => context.fillText(line, 96, titleBaseline + index * 66))
  context.fillStyle = MUTED
  context.font = `400 31px ${FONT}`
  fitText(
    context,
    `${sessionLabel}  ·  ${result.session.durationMinutes} 分鐘`,
    96,
    dateBaseline,
    880,
    31
  )
  context.fillStyle = INK
  context.font = `600 30px ${FONT}`
  fitText(context, `教練  ${result.coachDisplayName}`, 96, coachBaseline, 880, 30)
  context.strokeStyle = '#deded5'
  context.lineWidth = 2
  context.beginPath()
  context.moveTo(96, dividerY)
  context.lineTo(984, dividerY)
  context.stroke()

  let y = dividerY + 30
  if (sections.length === 0) {
    context.fillStyle = MUTED
    context.font = `500 36px ${FONT}`
    context.fillText('這堂課沒有動作紀錄。', 96, y + 190)
    y += 240
  }
  sections.forEach(({ exercise, nameLines }, exerciseIndex) => {
    fillRoundedRect(context, 96, y + 3, 54, 54, 13, INK)
    context.fillStyle = LIME
    context.textAlign = 'center'
    context.font = `700 26px ${FONT}`
    context.fillText(String(exerciseIndex + 1).padStart(2, '0'), 123, y + 41)
    context.textAlign = 'left'
    context.fillStyle = INK
    context.font = `700 42px ${FONT}`
    nameLines.forEach((line, index) => context.fillText(line, 174, y + 44 + index * 52))
    y += 70 + (nameLines.length - 1) * 52
    exercise.sets.forEach((set, setIndex) => {
      drawSetRow(context, exercise, set, setIndex, y)
      y += 80
    })
    y += 32
  })

  if (noteLines.length) {
    const top = y + 8
    fillRoundedRect(context, 96, top, 888, noteHeight, 16, SOFT)
    context.fillStyle = INK
    context.fillRect(96, top + 16, 7, noteHeight - 32)
    context.font = `700 27px ${FONT}`
    context.fillText('教練筆記', 130, top + 43)
    context.font = `400 32px ${FONT}`
    noteLines.forEach((line, index) => context.fillText(line, 130, top + 92 + index * 48))
  }

  context.strokeStyle = '#deded5'
  context.beginPath()
  context.moveTo(96, cardBottom - 82)
  context.lineTo(984, cardBottom - 82)
  context.stroke()
  context.fillStyle = MUTED
  context.font = `600 23px ${FONT}`
  context.fillText('FORM COACH DESK', 96, cardBottom - 37)
  context.fillStyle = '#c3c6b8'
  context.textAlign = 'center'
  context.font = `400 23px ${FONT}`
  context.fillText('由 FORM Coach Desk 分享', 540, cardBottom + 54)

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'))
  if (!blob) throw new Error('image unavailable')
  return blob
}

function drawSetRow(
  context: CanvasRenderingContext2D,
  exercise: Exercise,
  set: Exercise['sets'][number],
  setIndex: number,
  y: number
) {
  fillRoundedRect(context, 96, y, 888, 72, 13, SOFT)
  context.fillStyle = MUTED
  context.font = `600 25px ${FONT}`
  context.fillText(`SET ${setIndex + 1}`, 120, y + 47)
  const measurement =
    exercise.recording && set.measurements
      ? formatMeasurements(exercise.recording, set.measurements)
      : `${set.plannedWeight ?? '—'}${set.plannedWeight === null ? '' : ` ${set.unit}`}`
  context.fillStyle = INK
  context.font = `700 32px ${FONT}`
  fitText(context, measurement, 290, y + 48, exercise.recording ? 350 : 170, 32)
  if (!exercise.recording || !set.measurements) {
    context.font = `500 30px ${FONT}`
    context.fillText(set.actualReps === null ? '—' : `× ${set.actualReps}`, 485, y + 47)
  }
  context.fillStyle = MUTED
  context.font = `400 28px ${FONT}`
  context.fillText(`RPE ${set.rpe ?? '—'}`, 675, y + 46)
  context.fillStyle = set.result === 'incomplete' ? '#a43827' : INK
  if (set.result) drawResultIcon(context, set.result, 838, y + 36)
  context.font = `500 27px ${FONT}`
  context.fillText(
    set.result === 'completed' ? '已完成' : set.result === 'incomplete' ? '未完成' : '未記錄',
    set.result ? 866 : 838,
    y + 46
  )
}

function drawResultIcon(
  context: CanvasRenderingContext2D,
  result: 'completed' | 'incomplete',
  x: number,
  y: number
) {
  context.beginPath()
  context.lineWidth = 4
  context.lineCap = 'round'
  context.lineJoin = 'round'
  if (result === 'completed') {
    context.moveTo(x - 9, y)
    context.lineTo(x - 2, y + 7)
    context.lineTo(x + 11, y - 9)
  } else {
    context.moveTo(x - 8, y - 8)
    context.lineTo(x + 8, y + 8)
    context.moveTo(x + 8, y - 8)
    context.lineTo(x - 8, y + 8)
  }
  context.strokeStyle = context.fillStyle
  context.stroke()
}

function fillRoundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  color: string
) {
  context.beginPath()
  context.moveTo(x + radius, y)
  context.arcTo(x + width, y, x + width, y + height, radius)
  context.arcTo(x + width, y + height, x, y + height, radius)
  context.arcTo(x, y + height, x, y, radius)
  context.arcTo(x, y, x + width, y, radius)
  context.closePath()
  context.fillStyle = color
  context.fill()
}

function wrapLines(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const lines: string[] = []
  for (const paragraph of text.split('\n')) {
    let line = ''
    for (const character of paragraph) {
      if (line && context.measureText(line + character).width > maxWidth) {
        lines.push(line)
        line = character
      } else {
        line += character
      }
    }
    lines.push(line || ' ')
  }
  return lines
}

function fitText(
  context: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  baseSize: number
) {
  let size = baseSize
  while (context.measureText(text).width > maxWidth && size > 23) {
    size -= 2
    context.font = context.font.replace(/\d+px/, `${size}px`)
  }
  context.fillText(text, x, y, maxWidth)
}

function loadLogo(): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('logo unavailable'))
    image.src = '/brand/form-horizontal.png'
  })
}
