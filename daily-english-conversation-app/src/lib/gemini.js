const API_BASE = 'https://generativelanguage.googleapis.com/v1beta'
export const DEFAULT_MODEL = 'gemini-2.5-flash'

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
- 초급/중급/고급 난이도를 골고루 섞어서 구성 (하루 10개 중 다양한 난이도 포함)
- 대화에서 실제로 쓰인 핵심 표현 3~5개를 뽑아 의미와 예문을 함께 제공
- 반드시 요청된 JSON 스키마 형식으로만 응답

10개의 상황은 서로 겹치지 않게 다양하게 구성해줘.`
}

async function callGemini({ apiKey, model, prompt }) {
  const url = `${API_BASE}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`

  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
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
    let message = `Gemini API 요청 실패 (HTTP ${res.status})`
    try {
      const errBody = await res.json()
      if (errBody?.error?.message) message = errBody.error.message
    } catch {
      // ignore parse failure, keep default message
    }
    throw new Error(message)
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

export async function generateDailyConversations({ apiKey, model = DEFAULT_MODEL, avoidTitles = [] }) {
  if (!apiKey) throw new Error('Gemini API 키가 필요합니다.')
  const prompt = buildPrompt(avoidTitles)
  const conversations = await callGemini({ apiKey, model, prompt })

  return conversations.map((c, idx) => ({
    id: `${Date.now()}-${idx}`,
    ...c,
  }))
}

export async function validateApiKey({ apiKey, model = DEFAULT_MODEL }) {
  if (!apiKey) return { ok: false, message: 'API 키를 입력해주세요.' }
  try {
    const url = `${API_BASE}/models/${encodeURIComponent(model)}?key=${encodeURIComponent(apiKey)}`
    const res = await fetch(url)
    if (!res.ok) {
      const body = await res.json().catch(() => null)
      return { ok: false, message: body?.error?.message ?? `API 키 확인 실패 (HTTP ${res.status})` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, message: e.message ?? '네트워크 오류로 API 키를 확인하지 못했습니다.' }
  }
}
