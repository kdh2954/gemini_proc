const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
export const DEFAULT_MODEL = 'gemini-3-flash-preview'

// ListModels로 실제 확인됨: 이 모델이 generateContent를 지원한다(2026-10 기준).
// gemini-2.5-flash는 ListModels에는 나오지만 신규 계정에는 generateContent가 404로 막혀 있었다.
// generateContent의 responseSchema.type은 반드시 대문자 enum(STRING/OBJECT/ARRAY)이어야 한다.
const CONVERSATION_SCHEMA = {
  type: 'OBJECT',
  properties: {
    conversations: {
      type: 'ARRAY',
      minItems: 10,
      maxItems: 10,
      items: {
        type: 'OBJECT',
        properties: {
          title_ko: { type: 'STRING', description: '상황을 나타내는 한국어 제목 (예: 카페에서 주문하기)' },
          title_en: { type: 'STRING', description: 'English title of the situation' },
          category: { type: 'STRING', description: '카테고리 (예: 카페, 공항, 직장, 병원, 쇼핑 등)' },
          level: { type: 'STRING', enum: ['초급', '중급', '고급'] },
          situation_ko: { type: 'STRING', description: '대화 상황에 대한 한 문장 설명 (한국어)' },
          dialogue: {
            type: 'ARRAY',
            minItems: 6,
            maxItems: 10,
            items: {
              type: 'OBJECT',
              properties: {
                speaker: { type: 'STRING', description: '예: A 또는 B' },
                en: { type: 'STRING' },
                ko: { type: 'STRING' },
              },
              required: ['speaker', 'en', 'ko'],
            },
          },
          key_expressions: {
            type: 'ARRAY',
            minItems: 3,
            maxItems: 5,
            items: {
              type: 'OBJECT',
              properties: {
                phrase: { type: 'STRING' },
                meaning_ko: { type: 'STRING' },
                example_en: { type: 'STRING' },
              },
              required: ['phrase', 'meaning_ko', 'example_en'],
            },
          },
        },
        required: ['title_ko', 'title_en', 'category', 'level', 'situation_ko', 'dialogue', 'key_expressions'],
      },
    },
  },
  required: ['conversations'],
}

function buildPrompt(avoidTitles) {
  const avoidLine =
    avoidTitles && avoidTitles.length > 0
      ? `최근에 이미 다룬 상황이라 오늘은 피해야 할 주제 목록: ${avoidTitles.join(', ')}. 이 주제들과 겹치지 않는 새로운 상황으로 구성해줘.`
      : ''

  return `너는 한국인 영어 학습자를 위한 일상회화 교재를 만드는 전문 영어 강사야.
매일 실생활에서 마주칠 수 있는 서로 다른 10가지 상황(예: 카페, 공항, 직장, 식당, 병원, 쇼핑, 전화통화, 길찾기, 소셜 스몰토크, 호텔, 대중교통, 배달, 은행, 약속 잡기 등)을 골라
각 상황마다 자연스러운 영어 대화문을 만들어줘.

${avoidLine}

각 대화는 다음 조건을 지켜줘:
- 두 화자(A, B) 사이의 자연스럽고 실용적인 대화 6~10줄
- 각 줄마다 영어 원문과 정확한 한국어 번역을 함께 제공
- 초급/중급/고급 난이도를 골고루 섞어서 구성 (하루 10개 안에 다양한 난이도 포함)
- 대화에서 실제로 쓰인 핵심 표현 3~5개를 뽑아 의미와 예문을 함께 제공
- 반드시 요청된 JSON 스키마 형식으로만 응답

10개의 상황은 서로 겹치지 않게 다양하게 구성해줘.`
}

class GeminiError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

// 일시적 서버 오류(과부하 등)는 잠깐 대기 후 같은 모델로 재시도한다.
const RETRYABLE_STATUS = [429, 500, 503, 504]
const MAX_ATTEMPTS = 3
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function extractErrorMessage(status, rawText) {
  let body = null
  try {
    body = JSON.parse(rawText)
  } catch {
    // rawText가 JSON이 아닌 경우(HTML 에러 페이지 등) 아래에서 원문을 그대로 보여준다.
  }

  let message = `(HTTP ${status}) `
  if (body?.error?.message) {
    message += body.error.message
    if (body.error.status) message += ` [${body.error.status}]`
    const reasons = (body?.error?.details ?? []).map((d) => d?.reason).filter(Boolean)
    if (reasons.length > 0) message += ` - reason: ${reasons.join(', ')}`
  } else {
    message += rawText ? rawText.slice(0, 500) : 'Gemini API 요청 실패 (응답 본문 없음)'
  }
  return message
}

async function requestOnce({ apiKey, model, prompt }) {
  const res = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 1,
        responseMimeType: 'application/json',
        responseSchema: CONVERSATION_SCHEMA,
      },
    }),
  })

  if (!res.ok) {
    const rawText = await res.text().catch(() => '')
    throw new GeminiError(extractErrorMessage(res.status, rawText), res.status)
  }

  const data = await res.json()
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  if (!text) {
    throw new Error('Gemini API 응답에서 콘텐츠를 찾을 수 없습니다.')
  }

  let parsed
  try {
    parsed = JSON.parse(text)
  } catch {
    throw new Error('Gemini 응답을 JSON으로 파싱하지 못했습니다.')
  }

  if (!Array.isArray(parsed?.conversations) || parsed.conversations.length === 0) {
    throw new Error('Gemini 응답에 회화 데이터가 없습니다.')
  }

  return parsed.conversations
}

async function callGemini({ apiKey, model, prompt, retryDelayMs = 2000 }) {
  let lastError
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await requestOnce({ apiKey, model, prompt })
    } catch (e) {
      lastError = e
      if (!RETRYABLE_STATUS.includes(e.status) || attempt === MAX_ATTEMPTS) throw e
      await sleep(retryDelayMs * attempt)
    }
  }
  throw lastError
}

export async function generateDailyConversations({ apiKey, model = DEFAULT_MODEL, avoidTitles = [], retryDelayMs }) {
  if (!apiKey) throw new Error('Gemini API 키가 필요합니다.')
  const prompt = buildPrompt(avoidTitles)
  const conversations = await callGemini({ apiKey, model, prompt, retryDelayMs })

  return conversations.map((c, idx) => ({
    id: `${Date.now()}-${idx}`,
    ...c,
  }))
}

export async function listAvailableModels({ apiKey }) {
  if (!apiKey) throw new Error('API 키를 입력해주세요.')
  const res = await fetch(`${API_BASE}/models?pageSize=200`, {
    headers: { 'x-goog-api-key': apiKey },
  })
  const rawText = await res.text().catch(() => '')
  if (!res.ok) {
    throw new GeminiError(extractErrorMessage(res.status, rawText), res.status)
  }
  const data = JSON.parse(rawText)
  return (data?.models ?? []).map((m) => ({
    name: m.name?.replace(/^models\//, '') ?? m.name,
    supportedGenerationMethods: m.supportedGenerationMethods ?? [],
  }))
}

// responseSchema 없이 아주 단순한 텍스트 생성만 시도해, 문제가 스키마 때문인지
// 아니면 그보다 더 기본적인 요청 구조 때문인지 가려내기 위한 진단용 함수.
export async function testSimpleGeneration({ apiKey, model }) {
  if (!apiKey) throw new Error('API 키를 입력해주세요.')
  const res = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Say hello in one short sentence.' }] }],
    }),
  })
  const rawText = await res.text().catch(() => '')
  if (!res.ok) {
    throw new GeminiError(extractErrorMessage(res.status, rawText), res.status)
  }
  const data = JSON.parse(rawText)
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return text || '(빈 응답)'
}

// 아주 단순한 responseSchema로 구조화된 출력 자체가 되는지 확인하는 진단용 함수.
export async function testSimpleSchema({ apiKey, model }) {
  if (!apiKey) throw new Error('API 키를 입력해주세요.')
  const res = await fetch(`${API_BASE}/models/${encodeURIComponent(model)}:generateContent`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: 'Say hello.' }] }],
      generationConfig: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: { greeting: { type: 'STRING' } },
          required: ['greeting'],
        },
      },
    }),
  })
  const rawText = await res.text().catch(() => '')
  if (!res.ok) {
    throw new GeminiError(extractErrorMessage(res.status, rawText), res.status)
  }
  const data = JSON.parse(rawText)
  const text = data?.candidates?.[0]?.content?.parts?.map((p) => p.text ?? '').join('') ?? ''
  return text || '(빈 응답)'
}

export async function validateApiKey({ apiKey, model = DEFAULT_MODEL }) {
  if (!apiKey) return { ok: false, message: 'API 키를 입력해주세요.' }
  try {
    const url = `${API_BASE}/models/${encodeURIComponent(model)}`
    const res = await fetch(url, { headers: { 'x-goog-api-key': apiKey } })
    if (!res.ok) {
      const rawText = await res.text().catch(() => '')
      return { ok: false, message: extractErrorMessage(res.status, rawText) }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message ?? '네트워크 오류로 API 키를 확인하지 못했습니다.' }
  }
}
