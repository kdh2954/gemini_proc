import { useState } from 'react'
import { speak, speakSequence, isTtsSupported } from '../lib/tts'

const LEVEL_STYLE = {
  초급: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400',
  중급: 'bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400',
  고급: 'bg-rose-50 text-rose-700 dark:bg-rose-500/10 dark:text-rose-400',
}

export default function ConversationCard({ conversation, completed, onToggleComplete, defaultExpanded = false }) {
  const [expanded, setExpanded] = useState(defaultExpanded)
  const [showKo, setShowKo] = useState(true)
  const [playingAll, setPlayingAll] = useState(false)

  const levelClass = LEVEL_STYLE[conversation.level] ?? LEVEL_STYLE['중급']

  function handlePlayAll() {
    setPlayingAll(true)
    speakSequence(
      conversation.dialogue.map((l) => l.en),
      { onDone: () => setPlayingAll(false) },
    )
  }

  return (
    <div
      className={`rounded-2xl border bg-white shadow-sm transition-colors dark:bg-slate-900 ${
        completed
          ? 'border-emerald-300 dark:border-emerald-700'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="flex w-full items-start justify-between gap-3 px-4 py-3 text-left"
      >
        <div className="flex min-w-0 flex-1 items-start gap-3">
          <input
            type="checkbox"
            checked={completed}
            onClick={(e) => e.stopPropagation()}
            onChange={() => onToggleComplete(conversation.id)}
            className="mt-1 h-5 w-5 shrink-0 accent-violet-600"
          />
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${levelClass}`}>
                {conversation.level}
              </span>
              <span className="truncate text-xs text-slate-400">{conversation.category}</span>
            </div>
            <p className="mt-1 truncate font-semibold text-slate-900 dark:text-white">
              {conversation.title_ko}
            </p>
            <p className="truncate text-sm text-slate-500 dark:text-slate-400">{conversation.title_en}</p>
          </div>
        </div>
        <span className="mt-1 shrink-0 text-slate-400">{expanded ? '▲' : '▼'}</span>
      </button>

      {expanded && (
        <div className="border-t border-slate-100 px-4 py-4 dark:border-slate-800">
          <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">{conversation.situation_ko}</p>

          <div className="mb-3 flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handlePlayAll}
              disabled={!isTtsSupported() || playingAll}
              className="rounded-full bg-violet-600 px-3 py-1 text-xs font-semibold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              {playingAll ? '재생 중...' : '🔊 전체 듣기'}
            </button>
            <button
              type="button"
              onClick={() => setShowKo((v) => !v)}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              {showKo ? '해석 숨기기' : '해석 보기'}
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {conversation.dialogue.map((line, i) => (
              <li
                key={i}
                className="flex items-start gap-2 rounded-lg bg-slate-50 px-3 py-2 dark:bg-slate-800/60"
              >
                <span className="mt-0.5 shrink-0 rounded bg-slate-200 px-1.5 text-xs font-bold text-slate-600 dark:bg-slate-700 dark:text-slate-300">
                  {line.speaker}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-900 dark:text-slate-100">{line.en}</p>
                  {showKo && <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{line.ko}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => speak(line.en)}
                  disabled={!isTtsSupported()}
                  className="shrink-0 text-slate-400 hover:text-violet-600 disabled:opacity-40"
                  aria-label="이 문장 듣기"
                >
                  🔊
                </button>
              </li>
            ))}
          </ul>

          {conversation.key_expressions?.length > 0 && (
            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-400">핵심 표현</p>
              <ul className="flex flex-col gap-2">
                {conversation.key_expressions.map((exp, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-violet-100 bg-violet-50/60 px-3 py-2 dark:border-violet-900 dark:bg-violet-500/10"
                  >
                    <p className="text-sm font-semibold text-violet-700 dark:text-violet-300">
                      {exp.phrase}{' '}
                      <span className="font-normal text-slate-500 dark:text-slate-400">
                        — {exp.meaning_ko}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{exp.example_en}</p>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
