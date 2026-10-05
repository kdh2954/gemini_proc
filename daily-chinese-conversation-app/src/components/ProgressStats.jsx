export default function ProgressStats({ streak, totalDays, totalConversations }) {
  const items = [
    { label: '연속 학습일', value: `${streak}일`, icon: '🔥' },
    { label: '완주한 날', value: `${totalDays}일`, icon: '✅' },
    { label: '학습한 회화', value: `${totalConversations}개`, icon: '💬' },
  ]

  return (
    <div className="grid grid-cols-3 gap-2">
      {items.map((item) => (
        <div
          key={item.label}
          className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-center dark:border-slate-800 dark:bg-slate-900"
        >
          <div className="text-xl">{item.icon}</div>
          <div className="mt-1 text-lg font-bold text-slate-900 dark:text-white">{item.value}</div>
          <div className="text-xs text-slate-500 dark:text-slate-400">{item.label}</div>
        </div>
      ))}
    </div>
  )
}
