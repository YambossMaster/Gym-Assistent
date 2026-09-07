export interface DownloadableTrainingExercise {
  name: string
  sets: Array<{
    weight?: number
    reps?: number
    unit: 'kg' | 'lb'
    rpe?: number
    result?: 'completed' | 'incomplete'
  }>
}

export interface TrainingRecordImageInput {
  date: string
  weekday: string
  time: string
  studentName: string
  durationMinutes: number
  exercises: DownloadableTrainingExercise[]
  note: string
}

const wrapText = (context: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const lines: string[] = []
  let current = ''
  for (const character of text) {
    const candidate = current + character
    if (current && context.measureText(candidate).width > maxWidth) {
      lines.push(current)
      current = character
    } else current = candidate
  }
  if (current) lines.push(current)
  return lines
}

export async function downloadTrainingRecordImage(input: TrainingRecordImageInput) {
  await Promise.race([
    document.fonts?.ready ?? Promise.resolve(),
    new Promise((resolve) => window.setTimeout(resolve, 500))
  ])
  const width = 1080
  const exerciseHeight = input.exercises.reduce(
    (height, exercise) => height + 96 + Math.max(exercise.sets.length, 1) * 64,
    0
  )
  const noteLines = input.note ? Math.min(5, Math.max(1, Math.ceil(input.note.length / 32))) : 0
  const noteHeight = noteLines ? 92 + noteLines * 36 : 0
  const height = 510 + exerciseHeight + noteHeight
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas is unavailable')

  const ink = '#151711'
  const muted = '#777b71'
  const paper = '#f4f2ea'
  const white = '#fbfaf5'
  const line = '#d7d6ce'
  const lime = '#caff32'

  context.fillStyle = ink
  context.fillRect(0, 0, width, height)
  context.fillStyle = lime
  context.fillRect(52, 42, 56, 56)
  context.fillStyle = ink
  context.font = '800 34px sans-serif'
  context.textAlign = 'center'
  context.fillText('F', 80, 82)
  context.textAlign = 'left'
  context.fillStyle = '#f7f6ef'
  context.font = '800 28px sans-serif'
  context.fillText('FORM', 128, 82)
  context.fillStyle = paper
  context.fillRect(52, 120, width - 104, height - 174)

  let y = 168
  context.fillStyle = muted
  context.font = '700 18px monospace'
  context.fillText('TRAINING RECORD', 88, y)
  y += 48
  context.fillStyle = ink
  context.font = '800 42px sans-serif'
  context.fillText(`${input.date}　${input.weekday}`, 88, y)
  context.font = '700 30px monospace'
  context.fillText(input.time, 88, y + 44)

  context.fillStyle = lime
  context.fillRect(748, 170, 244, 84)
  context.fillStyle = ink
  context.font = '700 16px sans-serif'
  context.fillText('訓練時間', 776, 202)
  context.font = '700 30px monospace'
  context.fillText(`${input.durationMinutes} min`, 776, 236)

  y += 92
  context.strokeStyle = line
  context.beginPath()
  context.moveTo(88, y)
  context.lineTo(992, y)
  context.stroke()
  y += 42

  context.fillStyle = ink
  context.font = '800 32px sans-serif'
  context.fillText(`${input.studentName}的訓練紀錄`, 88, y)
  y += 42

  input.exercises.forEach((exercise, exerciseIndex) => {
    const cardHeight = 76 + Math.max(exercise.sets.length, 1) * 64
    context.fillStyle = white
    context.strokeStyle = line
    context.fillRect(88, y, 904, cardHeight)
    context.strokeRect(88, y, 904, cardHeight)
    context.fillStyle = muted
    context.font = '700 15px monospace'
    context.fillText(String(exerciseIndex + 1).padStart(2, '0'), 116, y + 39)
    context.fillStyle = ink
    context.font = '800 25px sans-serif'
    context.fillText(exercise.name, 160, y + 40)

    const sets = exercise.sets.length
      ? exercise.sets
      : [{ weight: undefined, reps: undefined, unit: 'kg' as const, rpe: undefined }]
    sets.forEach((set, setIndex) => {
      const rowY = y + 78 + setIndex * 64
      context.strokeStyle = line
      context.beginPath()
      context.moveTo(116, rowY - 20)
      context.lineTo(964, rowY - 20)
      context.stroke()
      context.fillStyle = muted
      context.font = '700 14px monospace'
      context.fillText(`SET ${setIndex + 1}`, 116, rowY + 9)
      context.fillStyle = ink
      context.font = '600 19px monospace'
      const weight = set.weight === undefined ? '—' : `${set.weight} ${set.unit}`
      const reps = set.reps === undefined ? '—' : String(set.reps)
      context.fillText(weight, 310, rowY + 9)
      context.fillText(`× ${reps}`, 515, rowY + 9)
      context.fillStyle = muted
      context.fillText(`RPE ${set.rpe ?? '—'}`, 650, rowY + 9)
      context.fillStyle = set.result === 'incomplete' ? '#b5442f' : muted
      context.font = '700 15px sans-serif'
      context.fillText(
        set.result === 'completed' ? '已完成' : set.result === 'incomplete' ? '未完成' : '未記錄',
        850,
        rowY + 9
      )
    })
    y += cardHeight + 22
  })

  if (input.note) {
    context.fillStyle = '#ecebe3'
    const boxHeight = 68 + noteLines * 36
    context.fillRect(88, y, 904, boxHeight)
    context.fillStyle = lime
    context.fillRect(88, y, 6, boxHeight)
    context.fillStyle = muted
    context.font = '700 15px monospace'
    context.fillText('COACH NOTE', 124, y + 34)
    context.fillStyle = ink
    context.font = '600 26px sans-serif'
    wrapText(context, input.note, 820)
      .slice(0, 5)
      .forEach((lineText, index) => context.fillText(lineText, 124, y + 74 + index * 36))
  }

  context.fillStyle = '#7b7e74'
  context.font = '600 15px monospace'
  context.fillText('FORM COACH DESK', 52, height - 70)

  const anchor = document.createElement('a')
  anchor.href = canvas.toDataURL('image/png')
  anchor.download = `FORM-訓練紀錄-${input.date.replaceAll('/', '-')}.png`
  document.body.append(anchor)
  anchor.click()
  anchor.remove()
}
