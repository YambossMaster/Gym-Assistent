import type { PublicTrainingResult } from '../../api'

export const participantColors = ['#397bb1', '#c57431', '#a44572'] as const

export function participantInitials(name: string): string {
  return Array.from(name).slice(-2).join('')
}

export function participantIndex(result: PublicTrainingResult, studentId?: string): number {
  return result.participants?.findIndex((person) => person.studentId === studentId) ?? -1
}

export function sharedNote(result: PublicTrainingResult): string | undefined {
  return result.trainingNote?.trim() ? result.trainingNote : undefined
}
