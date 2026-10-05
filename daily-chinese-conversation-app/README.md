# 매일중국어 - 하루 10개 상황회화

매일 새로운 10개의 중국어 상황회화(카페, 공항, 직장, 병원, 쇼핑 등)를 Gemini API로 생성해서 학습하는
반응형 웹앱입니다. 별도 백엔드/DB 없이 브라우저에서 바로 실행되며, 진행 상황은 로컬 브라우저에 저장됩니다.

## 주요 기능

- **하루 10개 상황회화 자동 생성**: Gemini API가 매일 서로 다른 실생활 상황의 중국어 대화문을 생성 (간체자 원문 + 한어병음 + 한국어 번역 + 핵심 표현)
- **중복 방지**: 최근 14일간 다룬 주제를 피해서 새로운 상황으로 구성
- **완료 체크 & 연속 학습일(streak)**: 대화별로 완료 체크하면 진행률과 연속 학습일이 자동으로 계산됨
- **음성 듣기(TTS)**: 문장별/전체 듣기로 중국어 발음을 들을 수 있음 (브라우저 내장 음성 합성 사용, `zh-CN`)
- **히스토리**: 과거에 학습한 날짜별 회화를 다시 열람 가능
- **다크 모드 지원**, 모바일 반응형 레이아웃

## API 키

Gemini API 키가 필요합니다. [Google AI Studio](https://aistudio.google.com/apikey)에서 무료로 발급받을 수 있습니다.
입력한 키는 브라우저의 `localStorage`에만 저장되며 별도 서버로 전송되지 않습니다.

## 개발 환경 실행

```bash
cd daily-chinese-conversation-app
npm install
npm run dev
```

## 빌드

```bash
npm run build
```

`dist/` 폴더에 정적 파일이 생성되며, GitHub Pages, Vercel, Netlify 등 정적 호스팅 서비스에 바로 배포할 수 있습니다.

## 기술 스택

- React 19 + Vite
- Tailwind CSS v4
- Gemini API (`generateContent`, structured output/JSON schema). 기본 모델은 `gemini-3-flash-preview`.
- 브라우저 `localStorage` (진행 상황 저장), `SpeechSynthesis` (TTS)

## 프로젝트 구조

```
src/
  components/
    ApiKeySetup.jsx        API 키 입력/검증 화면 (+ 모델 진단 도구)
    Header.jsx              상단 네비게이션 + 연속 학습일 표시
    ProgressStats.jsx       연속 학습일 / 완주일 / 학습한 회화 수 통계
    DailyConversations.jsx  오늘의 회화 생성 및 목록
    ConversationCard.jsx    대화 카드 (간체자/병음/번역, 듣기, 핵심 표현, 완료 체크)
    HistoryView.jsx         날짜별 학습 기록
  lib/
    gemini.js   Gemini API 호출 및 프롬프트/스키마 정의
    storage.js  로컬 저장소(진행 상황, streak 계산 등)
    tts.js      브라우저 음성 합성 헬퍼
```

## 영어 학습 앱과의 차이

같은 구조를 공유하는 자매 앱(daily-english-conversation-app)과 같은 GitHub Pages origin에서
함께 배포될 수 있도록 `localStorage` 키 접두사를 `dca:`로 분리했습니다.
