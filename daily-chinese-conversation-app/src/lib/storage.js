const KEYS = {
  apiKey: 'dca:apiKey',
  model: 'dca:model',
  days: 'dca:days',
}

export function todayKey(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

function parseDateKey(key) {
  const [y, m, d] = key.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function getApiKey() {
  return localStorage.getItem(KEYS.apiKey) ?? ''
}

export function setApiKey(key) {
  if (key) localStorage.setItem(KEYS.apiKey, key)
  else localStorage.removeItem(KEYS.apiKey)
}

export function getModel() {
  return localStorage.getItem(KEYS.model) ?? ''
}

export function setModel(model) {
  if (model) localStorage.setItem(KEYS.model, model)
  else localStorage.removeItem(KEYS.model)
}

function readDays() {
  try {
    const raw = localStorage.getItem(KEYS.days)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeDays(days) {
  localStorage.setItem(KEYS.days, JSON.stringify(days))
}

export function getDaySet(dateKey) {
  const days = readDays()
  return days[dateKey] ?? null
}

export function saveDaySet(dateKey, conversations) {
  const days = readDays()
  days[dateKey] = { conversations, completed: [] }
  writeDays(days)
}

export function toggleCompleted(dateKey, conversationId) {
  const days = readDays()
  const entry = days[dateKey]
  if (!entry) return null
  const set = new Set(entry.completed ?? [])
  if (set.has(conversationId)) set.delete(conversationId)
  else set.add(conversationId)
  entry.completed = Array.from(set)
  days[dateKey] = entry
  writeDays(days)
  return entry
}

export function getRecentTitles(days_ = 14, beforeDateKey = todayKey()) {
  const days = readDays()
  const titles = []
  const cursor = parseDateKey(beforeDateKey)
  for (let i = 0; i < days_; i++) {
    const key = todayKey(cursor)
    const entry = days[key]
    if (entry?.conversations) {
      for (const c of entry.conversations) {
        if (c.title_ko) titles.push(c.title_ko)
      }
    }
    cursor.setDate(cursor.getDate() - 1)
  }
  return titles
}

export function getAllDayKeysDesc() {
  const days = readDays()
  return Object.keys(days).sort((a, b) => (a < b ? 1 : -1))
}

function isDayFull(entry) {
  return (
    !!entry &&
    Array.isArray(entry.conversations) &&
    entry.conversations.length > 0 &&
    (entry.completed?.length ?? 0) >= entry.conversations.length
  )
}

export function computeStreak() {
  const days = readDays()
  const today = new Date()
  let cursor = new Date(today)

  if (!isDayFull(days[todayKey(today)])) {
    cursor.setDate(cursor.getDate() - 1)
  }

  let streak = 0
  while (true) {
    const key = todayKey(cursor)
    if (isDayFull(days[key])) {
      streak += 1
      cursor.setDate(cursor.getDate() - 1)
    } else {
      break
    }
  }
  return streak
}

export function getStats() {
  const days = readDays()
  const dateKeys = Object.keys(days)
  const totalDays = dateKeys.filter((k) => isDayFull(days[k])).length
  const totalConversations = dateKeys.reduce((sum, k) => sum + (days[k].completed?.length ?? 0), 0)
  return {
    totalDays,
    totalConversations,
    streak: computeStreak(),
  }
}
