import { useEffect, useState } from 'react'
import ConversationCard from './ConversationCard'
import { generateDailyConversations } from '../lib/gemini'
import { getDaySet, saveDaySet, toggleCompleted, getRecentTitles } from '../lib/storage'

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

export default function DailyConversations({ apiKey, model, dateKey, onProgress }) {
  const [daySet, setDaySet] = useState(() => getDaySet(dateKey))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    setDaySet(getDaySet(dateKey))
  }, [dateKey])

  async function handleGenerate({ regenerate = false } = {}) {
    if (regenerate) {
      const ok = window.confirm('오늘의 회화를 새로 생성하면 지금까지의 완료 체크가 초기화됩니다. 계속할까요?')
      if (!ok) return
    }
    setLoading(true)
    setError(null)
    try {
      const avoidTitles = getRecentTitles(14, dateKey)
      const conversations = await generateDailyConversations({ apiKey, model, avoidTitles })
      saveDaySet(dateKey, conversations)
      const fresh = getDaySet(dateKey)
      setDaySet(fresh)
      onProgress?.()
    } catch (e) {
      setError(e.message ?? '회화 생성 중 오류가 발생했습니다.')
    } finally {
      setLoading(false)
    }
  }

  function handleToggle(id) {
    const updated = toggleCompleted(dateKey, id)
    if (updated) setDaySet({ ...updated })
    onProgress?.()
  }

  const total = daySet?.conversations?.length ?? 0
  const completedCount = daySet?.completed?.length ?? 0

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h2 className="text-base font-bold text-slate-900 dark:text-white">{formatDateKey(dateKey)}</h2>
        {daySet && (
          <button
            type="button"
            onClick={() => handleGenerate({ regenerate: true })}
            disabled={loading}
            className="text-xs font-semibold text-violet-600 hover:underline disabled:opacity-50 dark:text-violet-400"
          >
            🔄 다시 생성하기
          </button>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900 dark:bg-red-500/10 dark:text-red-400">
          {error}
        </div>
      )}

      {!daySet && !loading && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-10 text-center dark:border-slate-700 dark:bg-slate-900">
          <span className="text-3xl">📚</span>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            오늘의 상황회화 10개를 Gemini가 새로 만들어 드려요.
          </p>
          <button
            type="button"
            onClick={() => handleGenerate()}
            className="rounded-full bg-violet-600 px-5 py-2 text-sm font-semibold text-white hover:bg-violet-700"
          >
            오늘의 회화 생성하기
          </button>
        </div>
      )}

      {loading && (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-slate-200 bg-white px-6 py-10 text-center dark:border-slate-800 dark:bg-slate-900">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-violet-600 border-t-transparent" />
          <p className="text-sm text-slate-500 dark:text-slate-400">
            오늘의 상황회화 10개를 생성하고 있어요. 잠시만 기다려주세요...
          </p>
        </div>
      )}

      {daySet && !loading && (
        <>
          <div>
            <div className="mb-1 flex justify-between text-xs text-slate-500 dark:text-slate-400">
              <span>진행률</span>
              <span>
                {completedCount} / {total}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: total > 0 ? `${(completedCount / total) * 100}%` : '0%' }}
              />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            {daySet.conversations.map((conversation) => (
              <ConversationCard
                key={conversation.id}
                conversation={conversation}
                completed={daySet.completed?.includes(conversation.id)}
                onToggleComplete={handleToggle}
              />
            ))}
          </div>

          {completedCount === total && total > 0 && (
            <div className="rounded-xl bg-emerald-50 px-4 py-3 text-center text-sm font-semibold text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400">
              🎉 오늘의 회화 10개를 모두 완료했어요! 내일도 만나요.
            </div>
          )}
        </>
      )}
    </div>
  )
}
