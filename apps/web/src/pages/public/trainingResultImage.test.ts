// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest'
import type { PublicTrainingResult } from '../../api'
import { createTrainingResultImage } from './trainingResultImage'

it('draws the group identity key and set owner into the downloaded image', async () => {
  const fillText = vi.fn()
  const context = {
    fillText,
    measureText: (text: string) => ({ width: text.length * 18 }),
    drawImage: vi.fn(),
    fillRect: vi.fn(),
    beginPath: vi.fn(),
    arcTo: vi.fn(),
    closePath: vi.fn(),
    fill: vi.fn(),
    stroke: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    arc: vi.fn()
  }
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D
  )
  vi.spyOn(HTMLCanvasElement.prototype, 'toBlob').mockImplementation((callback) =>
    callback(new Blob(['png'], { type: 'image/png' }))
  )
  Object.defineProperty(document, 'fonts', {
    configurable: true,
    value: { ready: Promise.resolve() }
  })
  class LoadedImage {
    width = 300
    height = 60
    onload: (() => void) | null = null
    set src(_value: string) {
      queueMicrotask(() => this.onload?.())
    }
  }
  vi.stubGlobal('Image', LoadedImage)
  const result: PublicTrainingResult = {
    coachDisplayName: '林教練',
    studentDisplayName: '晨練組',
    participants: [
      { studentId: 'a', name: '王大明', attendance: 'present' },
      { studentId: 'b', name: '林小華', attendance: 'absent' }
    ],
    session: {
      startsAt: '2026-10-22T01:00:00Z',
      endsAt: '2026-10-22T02:00:00Z',
      timeZone: 'Asia/Taipei',
      durationMinutes: 60
    },
    exercises: [
      {
        position: 1,
        definitionName: '深蹲',
        sets: [
          {
            position: 1,
            studentId: 'a',
            plannedWeight: 100,
            actualReps: 12,
            unit: 'kg',
            rpe: 8,
            result: 'completed'
          }
        ]
      }
    ],
    trainingNote: '今天動作穩定'
  }
  const image = await createTrainingResultImage(result, '10月22日 09:00–10:00')
  expect(image.type).toBe('image/png')
  const painted = fillText.mock.calls.map(([text]) => text)
  expect(painted).toContain('王大明')
  expect(painted).toContain('林小華 · 缺席')
  expect(painted).toContain('大明')
  expect(painted).toContain('今天動作穩定')
  expect(painted).toContain('教練  林教練')
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.unstubAllGlobals()
})
