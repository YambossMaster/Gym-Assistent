import { addDays, addMinutes, setHours, setMinutes, startOfDay, subDays } from 'date-fns'
import type { AppData, CourseSession } from './types'
import { exerciseCatalog } from './exerciseCatalog'

const at = (dayOffset: number, hours: number, minutes = 0) =>
  setMinutes(setHours(addDays(startOfDay(new Date()), dayOffset), hours), minutes)
const session = (
  id: string,
  studentId: string,
  day: number,
  hour: number,
  minute: number,
  duration: number,
  status: CourseSession['status']
): CourseSession => ({
  id,
  studentId,
  seriesId: `series-${studentId}`,
  startsAt: at(day, hour, minute).toISOString(),
  endsAt: addMinutes(at(day, hour, minute), duration).toISOString(),
  status,
  completedAt: status === 'completed' ? at(day, hour + 1).toISOString() : undefined,
  location: 'FORM Studio'
})

export const seedData = (): AppData => ({
  students: [
    {
      id: 's1',
      name: '陳品妤',
      phone: '0912 340 881',
      goal: '肌力提升・改善下背不適',
      privateNote: '久坐工作，避免過度腰椎伸展。',
      active: true,
      lineLinked: true,
      createdAt: subDays(new Date(), 120).toISOString()
    },
    {
      id: 's2',
      name: '林柏睿',
      phone: '0988 120 457',
      goal: '減脂・建立運動習慣',
      privateNote: '喜歡節奏快、組間休息短的安排。',
      active: true,
      lineLinked: false,
      createdAt: subDays(new Date(), 68).toISOString()
    },
    {
      id: 's3',
      name: '王思涵',
      phone: '0921 447 650',
      goal: '產後恢復・核心穩定',
      privateNote: '每週睡眠變動大，上課前確認疲勞。',
      active: true,
      lineLinked: true,
      createdAt: subDays(new Date(), 42).toISOString()
    },
    {
      id: 's4',
      name: '許家豪',
      phone: '0935 662 103',
      goal: '增肌・深蹲技術',
      privateNote: '',
      active: true,
      lineLinked: false,
      createdAt: subDays(new Date(), 20).toISOString()
    }
  ],
  purchases: [
    {
      id: 'p1',
      studentId: 's1',
      purchasedAt: subDays(new Date(), 90).toISOString(),
      amount: 24000,
      lessonCount: 12,
      note: '12 堂方案'
    },
    {
      id: 'p2',
      studentId: 's1',
      purchasedAt: subDays(new Date(), 10).toISOString(),
      amount: 16000,
      lessonCount: 8,
      note: '續課'
    },
    {
      id: 'p3',
      studentId: 's2',
      purchasedAt: subDays(new Date(), 50).toISOString(),
      amount: 20000,
      lessonCount: 10,
      note: ''
    },
    {
      id: 'p4',
      studentId: 's3',
      purchasedAt: subDays(new Date(), 34).toISOString(),
      amount: 16000,
      lessonCount: 8,
      note: ''
    },
    {
      id: 'p5',
      studentId: 's4',
      purchasedAt: subDays(new Date(), 18).toISOString(),
      amount: 12000,
      lessonCount: 6,
      note: '新生方案'
    }
  ],
  series: [
    {
      id: 'series-s1',
      studentId: 's1',
      weekday: 3,
      localStartTime: '09:00',
      durationMinutes: 60,
      intervalWeeks: 1,
      active: true
    },
    {
      id: 'series-s2',
      studentId: 's2',
      weekday: 3,
      localStartTime: '11:00',
      durationMinutes: 60,
      intervalWeeks: 1,
      active: true
    },
    {
      id: 'series-s3',
      studentId: 's3',
      weekday: 3,
      localStartTime: '14:30',
      durationMinutes: 60,
      intervalWeeks: 1,
      active: true
    },
    {
      id: 'series-s4',
      studentId: 's4',
      weekday: 4,
      localStartTime: '18:30',
      durationMinutes: 75,
      intervalWeeks: 1,
      active: true
    }
  ],
  sessions: [
    session('old1', 's1', -14, 9, 0, 60, 'completed'),
    session('old2', 's1', -7, 9, 0, 60, 'completed'),
    session('old3', 's2', -7, 11, 0, 60, 'completed'),
    session('old4', 's2', -2, 11, 0, 60, 'completed'),
    session('old5', 's3', -8, 14, 30, 60, 'completed'),
    session('today1', 's1', 0, 9, 0, 60, 'scheduled'),
    session('today2', 's2', 0, 11, 0, 60, 'scheduled'),
    session('today3', 's3', 0, 14, 30, 60, 'scheduled'),
    session('future1', 's4', 1, 18, 30, 75, 'scheduled'),
    session('future2', 's1', 2, 9, 0, 60, 'scheduled'),
    session('future3', 's2', 4, 11, 0, 60, 'scheduled'),
    session('future4', 's3', 5, 14, 30, 60, 'scheduled')
  ],
  records: [
    {
      sessionId: 'today1',
      privateNote: '觀察右側膝蓋內夾，主項保持 RPE 7。',
      updatedAt: new Date().toISOString(),
      exercises: [
        {
          id: 'e1',
          definitionId: 'builtin-019',
          name: '高腳杯深蹲',
          region: '腿部',
          performanceMetric: 'weight',
          sets: [1, 2, 3].map((n) => ({
            id: `e1-${n}`,
            plannedWeight: 18,
            plannedReps: 10,
            unit: 'kg' as const
          }))
        },
        {
          id: 'e2',
          name: '啞鈴羅馬尼亞硬舉',
          region: '後鏈',
          performanceMetric: 'weight',
          sets: [1, 2, 3].map((n) => ({
            id: `e2-${n}`,
            plannedWeight: 16,
            plannedReps: 8,
            unit: 'kg' as const
          }))
        },
        {
          id: 'e3',
          name: '死蟲式',
          region: '核心',
          performanceMetric: 'reps',
          sets: [1, 2, 3].map((n) => ({
            id: `e3-${n}`,
            plannedWeight: 0,
            plannedReps: 10,
            unit: 'kg' as const
          }))
        }
      ]
    },
    {
      sessionId: 'old1',
      privateNote: '深蹲活動度比上週好。',
      updatedAt: subDays(new Date(), 14).toISOString(),
      exercises: [
        {
          id: 'e4',
          definitionId: 'builtin-019',
          name: '高腳杯深蹲',
          region: '腿部',
          performanceMetric: 'weight',
          sets: [1, 2, 3].map((n) => ({
            id: `e4-${n}`,
            plannedWeight: 16,
            plannedReps: 10,
            actualReps: n === 3 ? 8 : 10,
            result: n === 3 ? ('incomplete' as const) : ('completed' as const),
            unit: 'kg' as const,
            rpe: n === 3 ? 8 : 7
          }))
        }
      ]
    },
    {
      sessionId: 'old2',
      privateNote: '工作重量穩定上升，動作品質維持。',
      updatedAt: subDays(new Date(), 7).toISOString(),
      exercises: [
        {
          id: 'e5',
          definitionId: 'builtin-019',
          name: '高腳杯深蹲',
          region: '腿部',
          performanceMetric: 'weight',
          sets: [1, 2, 3].map((n) => ({
            id: `e5-${n}`,
            plannedWeight: n === 1 ? 16 : 17.5,
            plannedReps: 10,
            actualReps: 10,
            result: 'completed' as const,
            unit: 'kg' as const,
            rpe: n === 3 ? 8 : 7
          }))
        }
      ]
    }
  ],
  blocks: [
    {
      id: 'b1',
      startsAt: at(2, 13).toISOString(),
      endsAt: at(2, 17).toISOString(),
      note: '個人進修'
    }
  ],
  links: [],
  availability: [1, 2, 3, 4, 5, 6].map((day) => ({
    id: `availability-${day}`,
    weekday: day,
    startTime: day === 6 ? '09:00' : '08:00',
    endTime: day === 6 ? '15:00' : '21:00',
    active: true
  })),
  availabilityOverrides: [],
  exercises: exerciseCatalog,
  settings: {
    displayName: 'Kevin 教練',
    timezone: 'Asia/Taipei',
    defaultDurationMinutes: 60,
    defaultWeightUnit: 'kg',
    reminderHoursBefore: 24,
    conflictScanEnabled: true,
    calendarStartHour: 7,
    calendarEndHour: 22
  }
})
