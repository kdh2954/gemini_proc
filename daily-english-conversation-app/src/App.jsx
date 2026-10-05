import { useState } from 'react'
import Header from './components/Header'
import ApiKeySetup from './components/ApiKeySetup'
import ProgressStats from './components/ProgressStats'
import DailyConversations from './components/DailyConversations'
import HistoryView from './components/HistoryView'
import { getApiKey, setApiKey, getModel, setModel, getStats, todayKey } from './lib/storage'
import { DEFAULT_MODEL, RETIRED_MODELS } from './lib/gemini'

function loadModel() {
  const saved = getModel()
  if (!saved || RETIRED_MODELS.includes(saved)) {
    setModel(DEFAULT_MODEL)
    return DEFAULT_MODEL
  }
  return saved
}

function useStats() {
  const [stats, setStats] = useState(() => getStats())
  const refresh = () => setStats(getStats())
  return [stats, refresh]
}

export default function App() {
  const [apiKey, setApiKeyState] = useState(() => getApiKey())
  const [model, setModelState] = useState(loadModel)
  const [view, setView] = useState('today')
  const [stats, refreshStats] = useStats()
  const dateKey = todayKey()

  function handleSaveKey({ apiKey: key, model: m }) {
    setApiKey(key)
    setModel(m)
    setApiKeyState(key)
    setModelState(m)
    setView('today')
  }

  if (!apiKey) {
    return (
      <div className="flex min-h-svh flex-col items-center justify-center bg-slate-50 px-4 dark:bg-slate-950">
        <ApiKeySetup initialKey={apiKey} initialModel={model} onSave={handleSaveKey} />
      </div>
    )
  }

  return (
    <div className="min-h-svh bg-slate-50 dark:bg-slate-950">
      <Header view={view} onNavigate={setView} streak={stats.streak} />
      <main className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-5">
        {view === 'today' && (
          <>
            <ProgressStats {...stats} />
            <DailyConversations apiKey={apiKey} model={model} dateKey={dateKey} onProgress={refreshStats} />
          </>
        )}

        {view === 'history' && (
          <>
            <ProgressStats {...stats} />
            <HistoryView onProgress={refreshStats} />
          </>
        )}

        {view === 'settings' && (
          <div className="flex flex-col gap-4">
            <ApiKeySetup initialKey={apiKey} initialModel={model} onSave={handleSaveKey} />
            <button
              type="button"
              onClick={() => {
                const ok = window.confirm('저장된 API 키를 삭제할까요? 학습 기록은 유지됩니다.')
                if (!ok) return
                setApiKey('')
                setApiKeyState('')
              }}
              className="mx-auto text-xs text-red-500 hover:underline"
            >
              API 키 삭제
            </button>
          </div>
        )}
      </main>
    </div>
  )
}
