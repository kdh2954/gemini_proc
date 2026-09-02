# notebooklm-mcp

NotebookLM에는 공식 공개 API가 없기 때문에, 브라우저 자동화(Playwright)로
Google 계정 로그인 세션을 만들고 이를 재사용해 NotebookLM을 조작하는
MCP(Model Context Protocol) 서버입니다.

## 설치

```bash
npm install
npm run build
```

`npm install` 시 `postinstall` 스크립트가 Playwright용 Chromium을 함께
설치합니다. 별도로 설치하려면:

```bash
npx playwright install chromium
```

## 제공 도구

| 도구 | 설명 |
| --- | --- |
| `notebooklm_login` | 브라우저 창을 띄워 Google 계정으로 로그인합니다. 사용자가 직접 로그인(2단계 인증 포함)을 완료하면 로그인 세션을 로컬 파일에 저장합니다. 기본 대기 시간은 5분(`timeoutSeconds`로 조절 가능). |
| `notebooklm_login_status` | 저장된 세션이 존재하는지, 아직 유효한지 headless 브라우저로 확인합니다. |
| `notebooklm_logout` | 저장된 로그인 세션 파일을 삭제합니다. |

로그인 세션(Playwright `storageState`)은 기본적으로
`~/.notebooklm-mcp/auth.json`에 저장되며, 저장소 바깥에 위치하므로 실수로
git에 커밋되지 않습니다. 저장 위치는 `NOTEBOOKLM_MCP_SESSION_PATH` 환경
변수로 바꿀 수 있습니다.

## Claude Desktop / MCP 클라이언트 설정 예시

```json
{
  "mcpServers": {
    "notebooklm": {
      "command": "node",
      "args": ["/absolute/path/to/gemini_proc/dist/index.js"]
    }
  }
}
```

## 사용 흐름

1. MCP 클라이언트(Claude 등)에서 `notebooklm_login` 도구를 호출합니다.
2. 로컬 화면에 브라우저 창이 열리면 Google 계정으로 직접 로그인합니다.
3. 로그인이 완료되면(구글 인증 쿠키가 생기는 시점) 자동으로 세션이
   저장되고 브라우저가 닫힙니다.
4. 이후 `notebooklm_login_status`로 세션 유효성을 확인하거나, 저장된
   세션을 재사용하는 다른 NotebookLM 자동화 도구를 이어서 구현할 수
   있습니다.

## 개발

```bash
npm run dev    # tsc watch 모드
npm start      # dist/index.js 실행
```
