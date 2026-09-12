import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createLessonPurchase,
  deleteStudent,
  getLessonPurchaseIncome,
  getStudentDetail,
  listStudents,
  updateStudent,
  type StudentDetail
} from '../../api'
import { queryKeys } from '../../query-keys'

export function useStudentsRouteQuery(session: Session) {
  const students = useQuery({
    queryKey: queryKeys.students(session.user.id),
    queryFn: () => listStudents(session.access_token)
  })
  const income = useQuery({
    queryKey: queryKeys.income(session.user.id),
    queryFn: () => getLessonPurchaseIncome(session.access_token)
  })
  return { students, income }
}

export function useStudentDetailRouteQuery(session: Session, studentId: string) {
  return useQuery({
    queryKey: queryKeys.student(session.user.id, studentId),
    queryFn: () => getStudentDetail(session.access_token, studentId)
  })
}

export function useStudentRouteMutations({
  session,
  studentId,
  onNotice,
  onDeleted
}: {
  session: Session
  studentId: string
  onNotice: (message: string) => void
  onDeleted: () => void
}) {
  const queryClient = useQueryClient()
  const save = useMutation({
    mutationFn: (input: Parameters<typeof updateStudent>[2]) =>
      updateStudent(session.access_token, studentId, input),
    onSuccess: (student) => {
      queryClient.setQueryData<StudentDetail>(
        queryKeys.student(session.user.id, studentId),
        (current) => (current ? { ...current, student } : current)
      )
      void queryClient.invalidateQueries({ queryKey: queryKeys.students(session.user.id) })
      onNotice('學生資料已儲存。')
    },
    onError: (error) => onNotice(readRouteError(error))
  })
  const purchase = useMutation({
    mutationFn: (input: Parameters<typeof createLessonPurchase>[2]) =>
      createLessonPurchase(session.access_token, studentId, input),
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: queryKeys.student(session.user.id, studentId)
      })
      void queryClient.invalidateQueries({ queryKey: queryKeys.students(session.user.id) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.income(session.user.id) })
      onNotice('購課已登錄。')
    },
    onError: (error) => onNotice(readRouteError(error))
  })
  const remove = useMutation({
    mutationFn: (version: number) => deleteStudent(session.access_token, studentId, version),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.student(session.user.id, studentId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.students(session.user.id) })
      onDeleted()
    },
    onError: (error) => onNotice(readRouteError(error))
  })
  return { save, purchase, remove }
}

function readRouteError(error: unknown) {
  return error instanceof Error ? error.message : '目前無法完成這項操作。'
}
