import { CircleDot, Dumbbell, PersonStanding, WavesHorizontal } from 'lucide-react'
import type { ReactNode } from 'react'

const paths: Record<string, ReactNode> = {
  單槓: (
    <>
      <path d="M3 4h18M5 4v17m14-17v17M8 9l4 4 4-4m-4 4v8" />
    </>
  ),
  雙槓: (
    <>
      <path d="M3 7h7m4 0h7M5 7v14m14-14v14M10 8l2 5 2-5m-2 5v8" />
    </>
  ),
  彈力帶: (
    <>
      <path d="M6 5c-2 0-3 2-3 4 0 4 4 10 9 10s9-6 9-10c0-2-1-4-3-4-3 0-3 5-6 5S9 5 6 5Z" />
      <path d="M8 12c1 2 2 3 4 3s3-1 4-3" />
    </>
  ),
  懸吊訓練帶: (
    <>
      <path d="M9 3h6m-3 0v4M8 7l-4 9m12-9 4 9M3 16h4v4H3zm14 0h4v4h-4z" />
    </>
  )
}

const equipmentDrawings: Record<string, ReactNode> = {
  槓鈴: (
    <>
      <path d="M3 24h42" />
      <rect x="6" y="17" width="5" height="14" rx="1" />
      <rect x="13" y="14" width="5" height="20" rx="1" />
      <rect x="30" y="14" width="5" height="20" rx="1" />
      <rect x="37" y="17" width="5" height="14" rx="1" />
    </>
  ),
  壺鈴: (
    <>
      <path d="M18 17v-5a6 6 0 0 1 12 0v5" />
      <path d="M16 18c-4 3-6 8-6 14 0 8 6 13 14 13s14-5 14-13c0-6-2-11-6-14-2-2-14-2-16 0Z" />
      <path d="M18 21h12" />
    </>
  ),
  滑輪: (
    <>
      <path d="M7 44V5h33v39M7 44h33" />
      <circle cx="34" cy="11" r="4" />
      <path d="M34 15v16m-6 0h12m-9 0 2 6h2l2-6" />
      <path d="M12 20h9v20h-9zM12 26h9M12 33h9" />
    </>
  ),
  固定式器械: (
    <>
      <path d="M5 43h38M8 9V5h34v38M34 5v11l-5 8" />
      <rect x="9" y="19" width="7" height="21" rx="1" />
      <path d="M9 25h7M9 32h7M21 16v19M21 32h15v5H21m10 0v6M22 16h8" />
    </>
  )
}

export function EquipmentGlyph({ equipment }: { equipment: string }) {
  const icon = equipmentDrawings[equipment] ? (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {equipmentDrawings[equipment]}
    </svg>
  ) : equipment === '啞鈴' ? (
    <Dumbbell />
  ) : equipment === '徒手' ? (
    <PersonStanding />
  ) : equipment === '藥球' ? (
    <CircleDot />
  ) : equipment === '戰繩' ? (
    <WavesHorizontal />
  ) : paths[equipment] ? (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {paths[equipment]}
    </svg>
  ) : null
  if (!icon) return null
  return (
    <span className="exercise-equipment-mark" aria-hidden="true">
      {icon}
    </span>
  )
}
