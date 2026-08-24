import { ArrowRight, Check, RotateCcw } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { Badge, FormSelect, PageHeader } from '../components'
import { useStore } from '../store'

export function SettingsPage() {
  const { data, saveSettings, resetDemo } = useStore()
  const [saved, setSaved] = useState(false)
  const [rangeError, setRangeError] = useState('')
  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const values = new FormData(event.currentTarget)
    const calendarStartHour = Number(values.get('calendarStartHour'))
    const calendarEndHour = Number(values.get('calendarEndHour'))
    if (calendarEndHour <= calendarStartHour) {
      setRangeError('結束時間必須晚於開始時間。')
      return
    }
    setRangeError('')
    saveSettings({
      displayName: String(values.get('displayName')),
      timezone: String(values.get('timezone')),
      defaultDurationMinutes: Number(values.get('duration')),
      defaultWeightUnit: String(values.get('unit')) as 'kg' | 'lb',
      reminderHoursBefore: Number(values.get('reminder')),
      conflictScanEnabled: values.get('conflictScan') === 'on',
      calendarStartHour,
      calendarEndHour
    })
    setSaved(true)
    window.setTimeout(() => setSaved(false), 1800)
  }
  return (
    <div className="page settings-page">
      <PageHeader
        eyebrow="SYSTEM / PREFERENCES"
        title="設定"
        description="讓系統貼合你的工作方式，而不是反過來。"
      />
      <form className="settings-grid" onSubmit={submit}>
        <section className="panel">
          <span className="eyebrow">COACH PROFILE</span>
          <h2>教練資料</h2>
          <div className="settings-form">
            <div className="field-row">
              <FormSelect
                label="行事曆開始"
                name="calendarStartHour"
                defaultValue={data.settings.calendarStartHour}
                options={Array.from({ length: 24 }, (_, hour) => ({
                  value: hour,
                  label: `${String(hour).padStart(2, '0')}:00`
                }))}
              />
              <FormSelect
                label="行事曆結束"
                name="calendarEndHour"
                defaultValue={data.settings.calendarEndHour}
                options={Array.from({ length: 24 }, (_, index) => index + 1).map((hour) => ({
                  value: hour,
                  label: hour === 24 ? '24:00（午夜）' : `${String(hour).padStart(2, '0')}:00`
                }))}
              />
            </div>
            <small className="field-help">控制日／週行事曆顯示的時間範圍，可延伸至午夜。</small>
            {rangeError && <small className="field-error">{rangeError}</small>}
            <label>
              顯示名稱
              <input name="displayName" defaultValue={data.settings.displayName} />
            </label>
            <FormSelect
              label="時區"
              name="timezone"
              defaultValue={data.settings.timezone}
              options={[
                { value: 'Asia/Taipei', label: '台北 GMT+8' },
                { value: 'Asia/Tokyo', label: '東京 GMT+9' },
                { value: 'America/Los_Angeles', label: '洛杉磯' }
              ]}
            />
            <div className="field-row">
              <FormSelect
                label="預設課長"
                name="duration"
                defaultValue={data.settings.defaultDurationMinutes}
                options={[45, 60, 75, 90].map((minutes) => ({
                  value: minutes,
                  label: `${minutes} 分鐘`
                }))}
              />
              <FormSelect
                label="重量單位"
                name="unit"
                defaultValue={data.settings.defaultWeightUnit}
                options={[
                  { value: 'kg', label: '公斤 kg' },
                  { value: 'lb', label: '磅 lb' }
                ]}
              />
            </div>
          </div>
        </section>
        <section className="panel">
          <span className="eyebrow">WORKFLOW</span>
          <h2>提醒與檢查</h2>
          <div className="settings-form">
            <FormSelect
              label="預設課前提醒"
              name="reminder"
              defaultValue={data.settings.reminderHoursBefore}
              options={[2, 12, 24, 48].map((hours) => ({
                value: hours,
                label: `${hours} 小時前`
              }))}
            />
            <label className="toggle-row">
              <span>
                <strong>每日衝突檢查</strong>
                <small>掃描未來七天的重疊與封鎖時段</small>
              </span>
              <input
                type="checkbox"
                name="conflictScan"
                defaultChecked={data.settings.conflictScanEnabled}
              />
            </label>
          </div>
          <div className="availability-summary">
            <span className="eyebrow">AVAILABLE HOURS</span>
            {data.availability
              .filter((rule) => rule.active)
              .map((rule) => (
                <div key={rule.id}>
                  <span>星期{['日', '一', '二', '三', '四', '五', '六'][rule.weekday]}</span>
                  <strong>
                    {rule.startTime} — {rule.endTime}
                  </strong>
                </div>
              ))}
          </div>
        </section>
        <section className="panel">
          <span className="eyebrow">LINE NOTIFICATION</span>
          <h2>LINE 自動提醒</h2>
          <div className="connection-card">
            <div className="line-logo">LINE</div>
            <div>
              <strong>尚未連接 Official Account</strong>
              <span>目前可使用系統分享按鈕；自動提醒需完成 OA 與 Webhook 設定。</span>
            </div>
            <Badge tone="amber">待設定</Badge>
          </div>
          <button type="button" className="button ghost wide">
            查看技術設定需求 <ArrowRight />
          </button>
        </section>
        <section className="panel danger-zone">
          <span className="eyebrow">DEMO DATA</span>
          <h2>展示資料</h2>
          <p>將所有本機操作重設回最初的示範狀態。這不影響任何外部資料。</p>
          <button
            type="button"
            className="button danger"
            onClick={() => {
              resetDemo()
              window.location.reload()
            }}
          >
            <RotateCcw />
            重設展示資料
          </button>
        </section>
        <div className="settings-savebar">
          <span>{saved ? '設定已更新' : '變更只會保存在這台裝置'}</span>
          <button className="button accent">
            {saved ? <Check /> : null}
            {saved ? '已儲存' : '儲存所有設定'}
          </button>
        </div>
      </form>
    </div>
  )
}
