// @vitest-environment jsdom
import { act } from 'react'
import { createRoot } from 'react-dom/client'
import { expect, it, vi } from 'vitest'
import { MeasurementInputs } from './MeasurementInputs'
import { emptyMeasurements, metricLabels, recordingTypes, type RecordingType } from './recording'

it('renders only the dimensions belonging to each of the eight types with explicit units', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  try {
    for (const [type, config] of Object.entries(recordingTypes)) {
      const values = emptyMeasurements(
        {
          defaultWeightUnit: 'lb',
          defaultDistanceUnit: 'km'
        },
        type as RecordingType
      )
      await act(async () =>
        root.render(
          <MeasurementInputs
            config={{ type: type as RecordingType, metrics: config.metrics }}
            values={values}
            onChange={() => {}}
          />
        )
      )
      expect(host.querySelectorAll('input')).toHaveLength(config.dimensions.length)
      expect(host.querySelectorAll('.measurement-field')).toHaveLength(config.dimensions.length)
      expect(host.querySelectorAll('.measurement-control')).toHaveLength(config.dimensions.length)
      expect(host.textContent).not.toContain('實際次數')
      for (const dimension of config.dimensions) {
        const unit =
          dimension === 'weight'
            ? 'lb'
            : dimension === 'duration'
              ? values.durationUnit
              : dimension === 'distance'
                ? values.distanceUnit
                : dimension === 'rounds'
                  ? '回合'
                  : '次'
        expect(host.textContent).toContain(unit)
        if (dimension === 'duration' || dimension === 'distance') {
          expect(
            host.querySelector(`[aria-label^="切換${metricLabels[dimension]}單位"]`)
          ).not.toBeNull()
        }
      }
      expect(host.querySelector('select')).toBeNull()
    }
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})

it('uses click targets to switch only compatible time and distance scales without changing meaning', async () => {
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true)
  const host = document.createElement('div')
  document.body.append(host)
  const root = createRoot(host)
  let changed = emptyMeasurements(
    { defaultWeightUnit: 'kg', defaultDistanceUnit: 'km' },
    'distance_duration'
  )
  changed = { ...changed, distance: 1, duration: 1, durationUnit: 'min' }
  try {
    await act(async () =>
      root.render(
        <MeasurementInputs
          config={{ type: 'distance_duration', metrics: ['duration', 'pace'] }}
          values={changed}
          onChange={(values) => {
            changed = values
          }}
        />
      )
    )
    await act(async () => {
      ;(host.querySelector('[aria-label^="切換距離單位"]') as HTMLButtonElement).click()
    })
    await act(async () =>
      root.render(
        <MeasurementInputs
          config={{ type: 'distance_duration', metrics: ['duration', 'pace'] }}
          values={changed}
          onChange={(values) => {
            changed = values
          }}
        />
      )
    )
    await act(async () => {
      ;(host.querySelector('[aria-label^="切換時間單位"]') as HTMLButtonElement).click()
    })
    expect(changed).toMatchObject({
      distance: 1000,
      distanceUnit: 'm',
      duration: 60,
      durationUnit: 'sec'
    })
    expect(host.querySelector('[aria-label="重量單位"]')).toBeNull()
  } finally {
    await act(async () => root.unmount())
    host.remove()
    vi.unstubAllGlobals()
  }
})
