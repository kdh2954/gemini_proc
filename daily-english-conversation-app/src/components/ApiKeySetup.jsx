import { useState } from 'react'
import { validateApiKey, listAvailableModels, DEFAULT_MODEL } from '../lib/gemini'

export default function ApiKeySetup({ initialKey, initialModel, onSave }) {
  const [apiKey, setApiKey] = useState(initialKey ?? '')
  const [model, setModel] = useState(initialModel || DEFAULT_MODEL)
  const [checking, setChecking] = useState(false)
  const [status, setStatus] = useState(null)
  const [listingModels, setListingModels] = useState(false)
  const [modelList, setModelList] = useState(null)
  const [modelListError, setModelListError] = useState(null)

  async function handleListModels() {
    setListingModels(true)
    setModelListError(null)
    setModelList(null)
    try {
      const models = await listAvailableModels({ apiKey: apiKey.trim() })
      setModelList(models)
    } catch (e) {
      setModelListError(e.message ?? '모델 목록을 가져오지 못했습니다.')
    } finally {
      setListingModels(false)
    }
  }

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

      <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">
        <button
          type="button"
          onClick={handleListModels}
          disabled={!apiKey.trim() || listingModels}
          className="w-full rounded-lg border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
        >
          {listingModels ? '확인 중...' : '🔍 이 키로 사용 가능한 모델 확인'}
        </button>

        {modelListError && (
          <p className="mt-2 whitespace-pre-wrap break-words text-xs text-red-600 dark:text-red-400">
            {modelListError}
          </p>
        )}

        {modelList && (
          <ul className="mt-2 max-h-48 overflow-y-auto rounded-lg border border-slate-200 text-xs dark:border-slate-700">
            {modelList.length === 0 && (
              <li className="px-2 py-1.5 text-slate-500 dark:text-slate-400">사용 가능한 모델이 없습니다.</li>
            )}
            {modelList.map((m) => (
              <li
                key={m.name}
                className="flex items-center justify-between gap-2 border-b border-slate-100 px-2 py-1.5 last:border-0 dark:border-slate-800"
              >
                <span className="font-mono text-slate-700 dark:text-slate-300">{m.name}</span>
                <span className="shrink-0 text-slate-400">{m.supportedGenerationMethods.join(', ')}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}
