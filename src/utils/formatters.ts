import { format, parseISO } from 'date-fns'
import { zhTW } from 'date-fns/locale'

export const money = new Intl.NumberFormat('zh-TW', {
  style: 'currency',
  currency: 'TWD',
  maximumFractionDigits: 0
})

export const dateText = (iso: string) => format(parseISO(iso), 'M月d日 EEEE', { locale: zhTW })
export const timeText = (iso: string) => format(parseISO(iso), 'HH:mm')

export const nowGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return '早安'
  if (hour < 18) return '午安'
  return '晚安'
}
