import { useState } from 'react'
import ConversationCard from './ConversationCard'
import { getAllDayKeysDesc, getDaySet, toggleCompleted } from '../lib/storage'

const dateFormatter = new Intl.DateTimeFormat('ko-KR', {
  year: 'numeric',
  month: 'long',
  day: 'numeric',
  weekday: 'short',
})

function formatDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  return dateFormatter.format(new Date(y, m - 1, d))
}

export default function HistoryView({ onProgress }) {
  const [dayKeys] = useState(() => getAllDayKeysDesc())
  const [openKey, setOpenKey] = useState(null)
  const [version, setVersion] = useState(0)

  if (dayKeys.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
        아직 학습 기록이 없어요. 오늘의 회화를 먼저 생성해보세요.
      </div>
    )
  }

  function handleToggle(dateKey, id) {
    toggleCompleted(dateKey, id)
    setVersion((v) => v + 1)
    onProgress?.()
  }

  return (
    <div className="flex flex-col gap-2">
      {dayKeys.map((key) => {
        const entry = getDaySet(key)
        const total = entry?.conversations?.length ?? 0
        const completed = entry?.completed?.length ?? 0
        const isOpen = openKey === key

        return (
          <div
            key={`${key}-${version}`}
            className="rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900"
          >
            <button
              type="button"
              onClick={() => setOpenKey(isOpen ? null : key)}
              className="flex w-full items-center justify-between px-4 py-3 text-left"
            >
              <div>
                <p className="font-semibold text-slate-900 dark:text-white">{formatDateKey(key)}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {completed} / {total} 완료{completed === total && total > 0 ? ' · 🎉 완주' : ''}
                </p>
              </div>
              <span className="text-slate-400">{isOpen ? '▲' : '▼'}</span>
            </button>
            {isOpen && (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-4 py-4 dark:border-slate-800">
                {entry.conversations.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    completed={entry.completed?.includes(conversation.id)}
                    onToggleComplete={(id) => handleToggle(key, id)}
                  />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
