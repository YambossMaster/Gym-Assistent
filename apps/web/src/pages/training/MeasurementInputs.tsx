import {
  measurementUnit,
  metricLabels,
  recordingTypes,
  type Measurements,
  type RecordingConfig
} from './recording'

export function MeasurementInputs({
  config,
  values,
  onChange
}: {
  config: RecordingConfig
  values: Measurements
  onChange: (values: Measurements) => void
}) {
  const dimensions = recordingTypes[config.type].dimensions
  return (
    <div className={`measurement-inputs measurement-inputs--${dimensions.length}`}>
      {dimensions.map((d) => {
        const unitKey =
          d === 'weight'
            ? 'weightUnit'
            : d === 'duration'
              ? 'durationUnit'
              : d === 'distance'
                ? 'distanceUnit'
                : null
        const units =
          d === 'duration'
            ? ['sec', 'min']
            : values.distanceUnit === 'ft' || values.distanceUnit === 'mi'
              ? ['ft', 'mi']
              : ['m', 'km']
        const canToggleUnit = unitKey && d !== 'weight'
        return (
          <label className={`measurement-field${canToggleUnit ? ' has-unit-toggle' : ''}`} key={d}>
            <span className="measurement-label">{metricLabels[d]}</span>
            <div className="measurement-entry">
              <div className="measurement-control">
                <input
                  aria-label={metricLabels[d]}
                  inputMode={d === 'reps' || d === 'rounds' ? 'numeric' : 'decimal'}
                  type="number"
                  min="0"
                  max={d === 'duration' || d === 'distance' ? 1_000_000 : 10_000}
                  step={d === 'reps' || d === 'rounds' ? 1 : 0.001}
                  value={values[d] ?? ''}
                  onChange={(e) =>
                    onChange({
                      ...values,
                      [d]: e.target.value === '' ? null : Number(e.target.value)
                    })
                  }
                />
                {!canToggleUnit && (
                  <small className="measurement-unit-suffix">{measurementUnit(values, d)}</small>
                )}
                {canToggleUnit && (
                  <button
                    aria-label={`切換${metricLabels[d]}單位，目前 ${values[unitKey]}`}
                    className="measurement-unit-toggle"
                    onClick={() => {
                      const currentIndex = units.indexOf(values[unitKey] as (typeof units)[number])
                      const nextUnit = units[(currentIndex + 1) % units.length]!
                      onChange({
                        ...values,
                        [d]: convertScale(values[d], values[unitKey], nextUnit),
                        [unitKey]: nextUnit
                      })
                    }}
                    type="button"
                  >
                    {values[unitKey]}
                  </button>
                )}
              </div>
            </div>
          </label>
        )
      })}
    </div>
  )
}

function convertScale(value: number | null, from: string, to: string) {
  if (value === null || from === to) return value
  const factor: Record<string, number> = {
    sec: 1,
    min: 60,
    m: 1,
    km: 1000,
    ft: 0.3048,
    mi: 1609.344
  }
  return Math.round(((value * factor[from]!) / factor[to]!) * 1000) / 1000
}
