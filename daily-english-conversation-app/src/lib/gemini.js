const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
export const DEFAULT_MODEL = 'gemini-3.8-flash'

// gemini-2.5-flash는 신규 사용자에게 더 이상 제공되지 않는다(구글 API가 직접 안내).
// 구글은 gemini-3.8-flash + Interactions API(POST /v1beta/interactions) 사용을 권장한다.
// Interactions API의 response_format.schema는 Gemini의 구 generateContent와 달리
// 표준 JSON Schema 표기(소문자 string/object/array)를 사용한다.
const CONVERSATION_SCHEMA = {
  type: 'object',
  properties: {
    conversations: {
      type: 'array',
      minItems: 10,
      maxItems: 10,
      items: {
        type: 'object',
        properties: {
          title_ko: { type: 'string', description: '상황을 나타내는 한국어 제목 (예: 카페에서 주문하기)' },
          title_en: { type: 'string', description: 'English title of the situation' },
          category: { type: 'string', description: '카테고리 (예: 카페, 공항, 직장, 병원, 쇼핑 등)' },
          level: { type: 'string', enum: ['초급', '중급', '고급'] },
          situation_ko: { type: 'string', description: '대화 상황에 대한 한 문장 설명 (한국어)' },
          dialogue: {
            type: 'array',
            minItems: 6,
            maxItems: 10,
            items: {
              type: 'object',
              properties: {
                speaker: { type: 'string', description: '예: A 또는 B' },
                en: { type: 'string' },
                ko: { type: 'string' },
              },
              required: ['speaker', 'en', 'ko'],
            },
          },
          key_expressions: {
            type: 'array',
            minItems: 3,
            maxItems: 5,
            items: {
              type: 'object',
              properties: {
                phrase: { type: 'string' },
                meaning_ko: { type: 'string' },
                example_en: { type: 'string' },
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
  const res = await fetch(`${API_BASE}/interactions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': apiKey,
      // 주의: 'Api-Revision' 커스텀 헤더를 추가하면 브라우저 CORS 프리플라이트가
      // 막혀 요청 자체가 전송되지 않는다("Load failed"). 브라우저 직접 호출에서는 빼야 한다.
    },
    body: JSON.stringify({
      model,
      input: prompt,
      generation_config: { temperature: 1 },
      response_format: {
        type: 'text',
        mime_type: 'application/json',
        schema: CONVERSATION_SCHEMA,
      },
    }),
  })

  if (!res.ok) {
    const rawText = await res.text().catch(() => '')
    throw new GeminiError(extractErrorMessage(res.status, rawText), res.status)
  }

  const data = await res.json()
  const text = (data?.steps ?? [])
    .filter((s) => s?.type === 'model_output')
    .flatMap((s) => s?.content ?? [])
    .filter((c) => c?.type === 'text')
    .map((c) => c?.text ?? '')
    .join('')
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
