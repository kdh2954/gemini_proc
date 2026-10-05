function NavButton({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
        active
          ? 'bg-violet-600 text-white'
          : 'text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800'
      }`}
    >
      {children}
    </button>
  )
}

export default function Header({ view, onNavigate, streak }) {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/80 backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
      <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">🗣️</span>
          <h1 className="text-lg font-bold text-slate-900 dark:text-white">매일일본어</h1>
        </div>
        <nav className="flex items-center gap-1">
          <NavButton active={view === 'today'} onClick={() => onNavigate('today')}>
            오늘의 회화
          </NavButton>
          <NavButton active={view === 'history'} onClick={() => onNavigate('history')}>
            히스토리
          </NavButton>
          <NavButton active={view === 'settings'} onClick={() => onNavigate('settings')}>
            설정
          </NavButton>
        </nav>
        <div
          className="flex items-center gap-1 rounded-full bg-orange-50 px-3 py-1 text-sm font-semibold text-orange-600 dark:bg-orange-500/10 dark:text-orange-400"
          title="연속 학습일"
        >
          🔥 {streak}일
        </div>
      </div>
    </header>
  )
}
