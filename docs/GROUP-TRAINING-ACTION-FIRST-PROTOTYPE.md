# 學生群組訓練紀錄：以動作為主的雙模式原型

狀態：**2026-10-19 經 Product Owner 接受，作為日後網頁版多人訓練紀錄開發的 UI 模板**。這是互動與視覺基準，尚非正式儲存、完成上課或資料庫的 Contract，也未整合到正式產品。

## 日後開發的參考方式

- 先查看本地分支 `codex/group-training-ui-template` 的 `/__review/group-training?mode=A` 與 `?mode=B`，以及 [`GroupTrainingModesPrototype.tsx`](../apps/web/src/pages/training/GroupTrainingModesPrototype.tsx)。此路由只在開發模式掛載，使用記憶體預覽資料，重新整理會重設；連同 [`GroupTrainingPreviewPage.tsx`](../apps/web/src/pages/training/GroupTrainingPreviewPage.tsx) 與預覽專用 CSS 一起保留。
- 以現有 `TrainingWorkspace`、`ExercisePicker`、`SetCard`、課堂資訊與教練筆記作為延伸點。維持一堂課、一張以動作為主的課表；每位學生各有自己的組數與結果，不做獨立的第二套訓練頁架構。群組上限三人。
- Mode A 依建立順序交錯顯示組數；每列用學生色彩頭像、深色姓名與姓名下方的小字組號識別，長姓名省略，不改原有量測欄的位置與一般桌面欄寬。卡片底部按出席者提供各自的新增鍵。Mode B 用同一份組數按學生分區，新增鍵放在各學生標題列。
- 今日出缺勤直接點學生標籤切換，缺席以明暗表示。動作標題只在已有組數時顯示「N 人有紀錄」，計算該動作目前可見紀錄所屬的不同學生數。新增動作後出席者都有新增組數入口，不先跳出單體／全體選擇。畫面不放動作級「編輯參與學生」或草稿資料檢視入口。
- 模式切換保留在訓練紀錄標題旁。兩模式讀寫同一份草稿；切換只改顯示順序，不複製或改寫組數。頭像及專屬新增鍵維持藍、橘、紫三色。

這份接受決定只確定網頁版操作與排版的開發方向。正式 API、資料儲存、群組購課與排課、封存、分享、出缺勤持久化和全域模式偏好，仍須依後續 Contract 決定與驗證；不可把預覽假資料或 `skippedStudentIds` 的未呈現草稿欄位直接當成正式規則。

## 頁面層級

沿用正式 `TrainingWorkspace` 的課堂資訊、教練筆記、動作卡片與 `SetCard` 數值輸入。群組課在右側改成「動作 → 學生 → 組數」；模式只改變組數的排列，不建立第二份訓練資料。

```text
TrainingWorkspace
└─ GroupTrainingModesPrototype
   ├─ 今日出席標籤（直接點擊切換出缺勤）
   ├─ SharedActionCard[]
   │  ├─ 動作資訊 + 已有紀錄的學生數（零人時不顯示）
   │  ├─ Mode A: 依 sequence 排列 MemberSetRow[] + 每人專屬新增鍵
   │  └─ Mode B: 每人一個區塊，各自排列 MemberSetRow[] + 新增鍵
   └─ 現有 ExercisePicker（選定後直接新增共用動作）
```

模式切換放在「訓練紀錄」標題右側，採低對比的分段控制器。Mode A 以藍／橘／紫頭像及姓名識別學生，較小的本人組號放在姓名下方，隱藏原 `SetCard` 的重複組號；姓名過長時在固定學生欄內省略，完整姓名保留在提示文字中，不擠壓右側輸入。Mode B 的各學生區塊保留原組號。兩模式都依動作類型顯示重量／次數等量測欄名、RPE、結果。Mode B 的新增組數鍵在學生標題行右側，零組時沒有額外空白區塊。缺席只以頭像及姓名明暗呈現。

## 單一草稿

```ts
type GroupTrainingDraft = {
  members: { id: string; name: string; present: boolean }[]
  actions: {
    id: string // 本堂動作 occurrence ID，同一動作可加入兩次
    definition: ExerciseDefinition
    skippedStudentIds: string[]
  }[]
  sets: {
    actionId: string
    studentId: string
    sequence: number // 本堂全域遞增的建立順序
    value: TrainingSet // 沿用正式版組數值結構
  }[]
  nextSequence: number
}
type GroupMode = 'A' | 'B' // 顯示偏好，放在草稿之外
```

Mode A 對單一 `actionId` 的組數依 `sequence` 排序。Mode B 對同一批組數按 `studentId` 分組；每位學生的組號取自身在該動作中的順序。切換模式不修改草稿。新增組數只複製「同動作、同學生」上一組的安排數值；結果和 RPE 留空，避免把別人的重量帶給他。

加入動作時只建立一個共享 occurrence，預設所有出席者可新增組數。動作標題旁只在有人建立組數後顯示「N 人有紀錄」，以目前可見紀錄的不同學生數計算，不以今日出席人數代替。原型已移除「編輯參與學生」入口；個別學生不做某動作的操作方式留待後續設計。出缺勤可直接點擊學生標籤切換；缺席時該學生的動作區塊、組數和新增鍵在原型中隱藏，草稿數值暫存不刪除，恢復出席時重新顯示。正式儲存與完成上課時如何處理這類暫存組數，仍須在 Contract 中定義。

## 樣式對應

目前正式 Web 是 React + 專案 CSS，沒有 Tailwind 依賴；原型採現有視覺與 CSS。若日後用 Tailwind 實作同樣布局，可對應為：

- Mode A 列表：`flex flex-col divide-y divide-stone-200`；可用寬度足夠時每列約用 `grid grid-cols-[5rem_minmax(0,1fr)] items-center gap-2`，姓名與小字組號垂直排在同一標籤內；極窄版才把學生標籤放在輸入列上方。
- Mode A 新增鍵：外層 `grid gap-3`，依實際出席且參與的人數設定 `gridTemplateColumns: repeat(n, minmax(0,1fr))`；最多三人，各按鈕用實線邊框、輕微陰影與對應學生的藍／橘／紫色。
- Mode B 子區塊：`flex flex-col divide-y divide-stone-200`；每人區塊 `py-2 first:pt-0`，標題行以 `flex items-center justify-between` 放姓名、組數與小型新增鍵。
- 動作卡維持單欄垂直堆疊，不把三人的完整輸入表格水平並排；依右側面板實際寬度調整學生欄與欄間距。中等寬度仍沿用正式 `SetCard` 的 120px 量測輸入、75px RPE、157px 結果，只收緊欄間距；極窄面板才使用緊湊欄寬。

## 正式落地待處理

這份原型資料只在記憶體中，重新整理會清空。正式版目前的課堂訓練紀錄和 API 以單一學生為中心，還需要定義共享動作 occurrence、各學生組數的儲存與版本衝突，以及 `sequence` 的穩定順序。顯示偏好目前用 URL `?mode=A|B` 模擬；若要在設定全域保存，需另定偏好的 API 與跨裝置行為。左側課堂資訊收合屬可選項，等雙模式操作定案後再評估。
