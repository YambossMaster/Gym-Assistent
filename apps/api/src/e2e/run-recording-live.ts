import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { recordingDimensions, recordingMetrics, type RecordingType } from '../training/recording.js'

const env = process.env
const api = env.API_BASE_URL!
const fixturePath = path.join(os.tmpdir(), 'gym-recording-fixture.json')
const login = async (email: string, password: string) => {
  const response = await fetch(`${env.SUPABASE_URL}/auth/v1/token?grant_type=password`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_PUBLISHABLE_KEY!, 'content-type': 'application/json' },
    body: JSON.stringify({ email, password }),
  })
  assert.equal(response.status, 200, 'isolated account sign-in')
  return String(((await response.json()) as any).access_token)
}
const [coachA, coachB] = await Promise.all([
  login(env.COACH_A_EMAIL!, env.COACH_A_PASSWORD!),
  login(env.COACH_B_EMAIL!, env.COACH_B_PASSWORD!),
])
const request = async (
  url: string,
  method = 'GET',
  body?: unknown,
  token = coachA,
  status = 200,
) => {
  const response = await fetch(api + url, {
    method,
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  })
  assert.equal(response.status, status, `${method} ${url}: ${await response.clone().text()}`)
  return status === 204 ? null : ((await response.json()) as any)
}
type Fixture = { studentId: string; definitionIds: string[]; sessionIds: string[]; prefix: string }
const cleanup = async (fixture: Fixture) => {
  const detail = (await request(`/v1/students/${fixture.studentId}`)).detail
  assert.ok(detail.student.name.startsWith(fixture.prefix), 'cleanup owns isolated Student')
  await request(
    `/v1/students/${fixture.studentId}`,
    'DELETE',
    { confirmation: 'DELETE', version: detail.student.version },
    coachA,
    204,
  )
  const library = await request('/v1/exercises')
  for (const id of fixture.definitionIds) {
    const definition = library.definitions.find((d: any) => d.id === id)
    if (!definition) continue
    assert.ok(definition.name.startsWith(fixture.prefix), 'cleanup owns isolated definition')
    await request(
      `/v1/exercises/${id}`,
      'DELETE',
      { confirmation: 'DELETE', version: definition.version, operationId: crypto.randomUUID() },
      coachA,
      204,
    )
  }
  if (fs.existsSync(fixturePath)) fs.unlinkSync(fixturePath)
}
if (process.argv.includes('--cleanup')) {
  await cleanup(JSON.parse(fs.readFileSync(fixturePath, 'utf8')))
  console.log('Recording browser fixtures cleaned up.')
} else {
  const prefix = `M7.5 recording ${Date.now()}`
  const student = (
    await request(
      '/v1/students',
      'POST',
      { name: prefix, goal: 'isolated recording acceptance' },
      coachA,
      201,
    )
  ).student
  const fixture: Fixture = { studentId: student.id, definitionIds: [], sessionIds: [], prefix }
  let success = false
  try {
    const definitions = []
    for (const type of Object.keys(recordingMetrics) as RecordingType[]) {
      const definition = (
        await request(
          '/v1/exercises',
          'POST',
          {
            name: `${prefix} ${type}`,
            equipment: '測試器材',
            bodyParts: ['核心'],
            movementType: '系統動作',
            performanceMetric: 'reps',
            recording: { type, metrics: recordingMetrics[type] },
            operationId: crypto.randomUUID(),
          },
          coachA,
          201,
        )
      ).definition
      definitions.push(definition)
      fixture.definitionIds.push(definition.id)
    }
    const first = definitions[0]
    await request(
      `/v1/exercises/${first.id}/metrics`,
      'PUT',
      { metrics: ['weight'], version: first.version, operationId: crypto.randomUUID() },
      coachB,
      404,
    )
    await request(
      `/v1/exercises/${first.id}/metrics`,
      'PUT',
      { metrics: [], version: first.version, operationId: crypto.randomUUID() },
      coachA,
      400,
    )
    await request(
      `/v1/exercises/${first.id}/metrics`,
      'PUT',
      { metrics: ['rounds'], version: first.version, operationId: crypto.randomUUID() },
      coachA,
      400,
    )
    let latest: any
    for (let occurrence = 0; occurrence < 3; occurrence++) {
      const start = Math.floor(Date.now() / 900_000) * 900_000 - (3 - occurrence) * 86_400_000
      const course = (
        await request(
          '/v1/sessions',
          'POST',
          {
            studentId: student.id,
            startsAt: new Date(start).toISOString(),
            endsAt: new Date(start + 3_600_000).toISOString(),
            location: 'Isolated recording acceptance',
          },
          coachA,
          201,
        )
      ).session
      fixture.sessionIds.push(course.id)
      const exercises: any[] = definitions.map((d) => {
        const dimensions = recordingDimensions[d.recording.type as RecordingType]
        const values: any = {
          weight: null,
          reps: null,
          duration: null,
          distance: null,
          rounds: null,
          weightUnit: 'kg',
          durationUnit: 'sec',
          distanceUnit: 'm',
        }
        for (const dimension of dimensions)
          values[dimension] =
            dimension === 'weight'
              ? 40 + occurrence * 5
              : dimension === 'reps'
                ? 8 + occurrence
                : dimension === 'duration'
                  ? 300 - occurrence * 10
                  : dimension === 'distance'
                    ? occurrence === 1
                      ? 500
                      : 1000
                    : 5 + occurrence
        return {
          id: crypto.randomUUID(),
          definitionId: d.id,
          definitionVersion: d.version,
          formatVersion: 2,
          sets: [
            {
              id: crypto.randomUUID(),
              plannedWeight: null,
              plannedReps: null,
              actualReps: null,
              rpe: 7.5,
              result: 'completed',
              unit: 'kg',
              measurements: values,
            },
          ],
        }
      })
      const payload: any = {
        privateNote: 'PRIVATE-RECORDING-ACCEPTANCE',
        recordVersion: 0,
        sessionVersion: course.version,
        operationId: crypto.randomUUID(),
        exercises,
      }
      const saved: any = (await request(`/v1/sessions/${course.id}/training`, 'PUT', payload))
        .training
      assert.equal(saved.record.exercises.length, 8)
      assert.deepEqual(
        saved.record.exercises.map((e: any) => e.sets[0].measurements),
        exercises.map((e) => e.sets[0].measurements),
      )
      assert.equal(saved.exerciseSummaries[0].series.length, 2, 'weight and repetitions series')
      const noChange = (
        await request(`/v1/sessions/${course.id}/training`, 'PUT', {
          ...payload,
          recordVersion: saved.record.version,
          operationId: crypto.randomUUID(),
        })
      ).training
      assert.equal(
        noChange.record.version,
        saved.record.version,
        'JSON key order must not create a phantom record change',
      )
      const replay = (await request(`/v1/sessions/${course.id}/training`, 'PUT', payload)).training
      assert.equal(replay.record.version, saved.record.version, 'exact replay')
      await request(
        `/v1/sessions/${course.id}/training`,
        'PUT',
        { ...payload, privateNote: 'changed' },
        coachA,
        409,
      )
      await request(`/v1/sessions/${course.id}/training`, 'GET', undefined, coachB, 404)
      const oldClient = structuredClone(payload)
      oldClient.recordVersion = saved.record.version
      oldClient.operationId = crypto.randomUUID()
      for (const e of oldClient.exercises) {
        delete (e as any).formatVersion
        for (const set of e.sets) delete (set as any).measurements
      }
      await request(`/v1/sessions/${course.id}/training`, 'PUT', oldClient, coachA, 409)
      latest = (
        await request(`/v1/sessions/${course.id}/training/complete`, 'POST', {
          ...payload,
          recordVersion: saved.record.version,
          operationId: crypto.randomUUID(),
        })
      ).training
    }
    const time = latest.exerciseSummaries[4].series.filter((s: any) => s.metric === 'duration')
    assert.deepEqual(
      time.map((s: any) => s.distanceMetres).sort((a: number, b: number) => a - b),
      [500, 1000],
    )
    assert.equal(time.find((s: any) => s.distanceMetres === 1000).points.length, 2)
    const metricsPayload = {
      metrics: ['weight'],
      version: first.version,
      operationId: crypto.randomUUID(),
    }
    const selected = (await request(`/v1/exercises/${first.id}/metrics`, 'PUT', metricsPayload))
      .definition
    assert.deepEqual(selected.recording.metrics, ['weight'])
    const selectedReplay = (
      await request(`/v1/exercises/${first.id}/metrics`, 'PUT', metricsPayload)
    ).definition
    assert.equal(selectedReplay.version, selected.version)
    await request(
      `/v1/exercises/${first.id}/metrics`,
      'PUT',
      { ...metricsPayload, operationId: crypto.randomUUID() },
      coachA,
      409,
    )
    const reopened = (await request(`/v1/sessions/${fixture.sessionIds[2]}/training`)).training
    assert.deepEqual(
      reopened.record.exercises[0].recording.metrics,
      ['weight'],
      'selection survives course reload',
    )
    await request(`/v1/exercises/${first.id}/metrics`, 'PUT', {
      metrics: ['weight', 'reps'],
      version: selected.version,
      operationId: crypto.randomUUID(),
    })
    const performance = await request(`/v1/students/${student.id}/performance`)
    assert.equal(performance.performance.filter((entry: any) => entry.recording).length, 8)
    assert.ok(!JSON.stringify(performance).includes('PRIVATE-RECORDING-ACCEPTANCE'))
    const issued = await request(
      `/v1/sessions/${fixture.sessionIds[2]}/capability-links`,
      'POST',
      { purpose: 'training_result', includeTrainingNote: false },
      coachA,
      201,
    )
    const publicResponse = await fetch(api + '/v1/public/training-result', {
      headers: { 'x-capability-token': issued.token },
    })
    // The capability header is verified below against the existing endpoint contract.
    if (publicResponse.status !== 200) throw Error('Public result status: ' + publicResponse.status)
    const publicResult = (await publicResponse.json()) as any
    assert.ok(!JSON.stringify(publicResult).includes('PRIVATE-RECORDING-ACCEPTANCE'))
    assert.ok(
      publicResult.trainingResult.exercises.every(
        (e: any) => e.recording && e.sets[0].measurements,
      ),
    )
    success = true
    if (env.KEEP_RECORDING_FIXTURE === 'true')
      fs.writeFileSync(fixturePath, JSON.stringify(fixture))
    console.log(
      JSON.stringify({
        passed: true,
        types: 8,
        sessions: 3,
        assertions:
          'round-trip, replay, conflict, old-client rejection, dual metrics, fixed-distance time groups, persistent selection, public allowlist, two-Coach isolation',
        browserSessionId: fixture.sessionIds[2],
      }),
    )
  } finally {
    if (!success || env.KEEP_RECORDING_FIXTURE !== 'true') await cleanup(fixture)
  }
}
