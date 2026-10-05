import { useState } from 'react'
import { validateApiKey, DEFAULT_MODEL } from '../lib/gemini'

export default function ApiKeySetup({ initialKey, initialModel, onSave }) {
  const [apiKey, setApiKey] = useState(initialKey ?? '')
  const [model, setModel] = useState(initialModel || DEFAULT_MODEL)
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState(null)

  async function handleSave(e) {
    e.preventDefault()
    setChecking(true)
    setStatus(null)
    const result = await validateApiKey({ apiKey: apiKey.trim(), model: model.trim() || DEFAULT_MODEL })
    setChecking(false)
    if (!result.ok) {
      setStatus({ ok: false, message: result.message })
      return
    }
    setStatus({ ok: true, message: 'API 키가 확인되었습니다.' })
    onSave({ apiKey: apiKey.trim(), model: model.trim() || DEFAULT_MODEL })
  }

  return (
    <div className="mx-auto max-w-md rounded-2xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
      <h2 className="text-lg font-bold text-slate-900 dark:text-white">Gemini API 키 설정</h2>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        매일 새로운 10개의 상황회화를 생성하려면 본인의 Gemini API 키가 필요합니다. 키는 이 브라우저에만
        저장되며 서버로 전송되지 않습니다.
      </p>
      <form onSubmit={handleSave} className="mt-4 flex flex-col gap-3">
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">API 키</span>
          <input
            type="password"
            value={apiKey}
            onChange={(e) => setApiKey(e.target.value)}
            placeholder="AIza..."
            required
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          <span className="font-medium text-slate-700 dark:text-slate-300">모델 (선택)</span>
          <input
            type="text"
            value={model}
            onChange={(e) => setModel(e.target.value)}
            placeholder={DEFAULT_MODEL}
            className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none focus:border-violet-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
          />
        </label>
        {status && (
          <p className={`text-sm ${status.ok ? 'text-emerald-600' : 'text-red-600'}`}>{status.message}</p>
        )}
        <button
          type="submit"
          disabled={checking}
          className="mt-1 rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-violet-700 disabled:opacity-60"
        >
          {checking ? '확인 중...' : '저장하고 시작하기'}
        </button>
      </form>
      <a
        href="https://aistudio.google.com/apikey"
        target="_blank"
        rel="noreferrer"
        className="mt-3 inline-block text-xs text-violet-600 hover:underline dark:text-violet-400"
      >
        Gemini API 키 발급받기 →
      </a>
    </div>
  )
}
