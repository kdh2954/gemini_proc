export function isTtsSupported() {
  return typeof window !== 'undefined' && 'speechSynthesis' in window
}

export function speak(text, { lang = 'en-US', rate = 0.95 } = {}) {
  if (!isTtsSupported() || !text) return
  window.speechSynthesis.cancel()
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = lang
  utter.rate = rate
  window.speechSynthesis.speak(utter)
}

export function speakSequence(texts, { lang = 'en-US', rate = 0.95, onDone } = {}) {
  if (!isTtsSupported() || texts.length === 0) {
    onDone?.()
    return
  }
  window.speechSynthesis.cancel()
  let i = 0
  const next = () => {
    if (i >= texts.length) {
      onDone?.()
      return
    }
    const utter = new SpeechSynthesisUtterance(texts[i])
    utter.lang = lang
    utter.rate = rate
    utter.onend = () => {
      i += 1
      next()
    }
    utter.onerror = () => {
      i += 1
      next()
    }
    window.speechSynthesis.speak(utter)
  }
  next()
}

export function stopSpeaking() {
  if (isTtsSupported()) window.speechSynthesis.cancel()
}
