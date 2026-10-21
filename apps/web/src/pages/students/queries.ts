import type { Session } from '@supabase/supabase-js'
import { useMutation, useQuery, useQueryClient, type QueryClient } from '@tanstack/react-query'
import {
  createLessonPurchase,
  deleteLessonPurchase,
  deleteStudent,
  getLessonPurchaseIncome,
  getStudentDetail,
  listStudents,
  updateStudent,
  updateLessonPurchase,
  type StudentDetail
} from '../../api'
import { queryKeys } from '../../query-keys'
import { invalidateTodayRoute } from '../today/queries'
import { planAccessKey } from '../../beta-admission/usePlanAccess'

export function invalidateStudentPurchaseQueries(
  queryClient: QueryClient,
  coachId: string,
  studentId: string
) {
  void queryClient.invalidateQueries({ queryKey: ['finances', coachId] })
  void queryClient.invalidateQueries({ queryKey: ['venues', coachId] })
  void queryClient.invalidateQueries({ queryKey: queryKeys.student(coachId, studentId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.students(coachId) })
  void queryClient.invalidateQueries({ queryKey: queryKeys.income(coachId) })
  invalidateTodayRoute(queryClient, coachId)
}

export function useStudentsRouteQuery(session: Session) {
  const students = useQuery({
    queryKey: queryKeys.students(session.user.id),
    queryFn: () => listStudents(session.access_token)
  })
  return { students }
}

export function useIncomeRouteQuery(session: Session) {
  return useQuery({
    queryKey: queryKeys.income(session.user.id),
    queryFn: () => getLessonPurchaseIncome(session.access_token)
  })
}

export function useStudentDetailRouteQuery(session: Session, studentId: string) {
  return useQuery({
    queryKey: queryKeys.student(session.user.id, studentId),
    queryFn: () => getStudentDetail(session.access_token, studentId)
  })
}

export async function refreshStudentAfterSave(
  queryClient: QueryClient,
  coachId: string,
  studentId: string,
  student: StudentDetail['student']
) {
  const key = queryKeys.student(coachId, studentId)
  queryClient.setQueryData<StudentDetail>(key, (current) =>
    current ? { ...current, student } : current
  )
  // A group edit also changes the members projection. Refresh it before closing the editor.
  await queryClient.invalidateQueries({ queryKey: key, refetchType: 'all' })
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
    onSuccess: async (student) => {
      await refreshStudentAfterSave(queryClient, session.user.id, studentId, student)
      void queryClient.invalidateQueries({ queryKey: queryKeys.students(session.user.id) })
      void queryClient.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
      invalidateTodayRoute(queryClient, session.user.id)
      onNotice('')
    },
    onError: (error) => onNotice(readRouteError(error))
  })
  const purchase = useMutation({
    mutationFn: (input: Parameters<typeof createLessonPurchase>[2]) =>
      createLessonPurchase(session.access_token, studentId, input),
    onSuccess: () => {
      invalidateStudentPurchaseQueries(queryClient, session.user.id, studentId)
      onNotice('')
    },
    onError: (error) => onNotice(readRouteError(error))
  })
  const remove = useMutation({
    mutationFn: (version: number) => deleteStudent(session.access_token, studentId, version),
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: queryKeys.student(session.user.id, studentId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.students(session.user.id) })
      void queryClient.invalidateQueries({ queryKey: planAccessKey(session.user.id) })
      invalidateTodayRoute(queryClient, session.user.id)
      onDeleted()
    },
    onError: (error) => onNotice(readRouteError(error))
  })
  const updatePurchase = useMutation({
    mutationFn: ({
      purchaseId,
      input
    }: {
      purchaseId: string
      input: Parameters<typeof updateLessonPurchase>[3]
    }) => updateLessonPurchase(session.access_token, studentId, purchaseId, input),
    onSuccess: () => {
      invalidateStudentPurchaseQueries(queryClient, session.user.id, studentId)
      onNotice('')
    },
    onError: (error) => onNotice(readRouteError(error))
  })
  const removePurchase = useMutation({
    mutationFn: ({ purchaseId, version }: { purchaseId: string; version: number }) =>
      deleteLessonPurchase(session.access_token, studentId, purchaseId, version),
    onSuccess: () => {
      invalidateStudentPurchaseQueries(queryClient, session.user.id, studentId)
      onNotice('')
    },
    onError: (error) => onNotice(readRouteError(error))
  })
  return { save, purchase, remove, updatePurchase, removePurchase }
}

function readRouteError(error: unknown) {
  return error instanceof Error ? error.message : '目前無法完成這項操作。'
}
