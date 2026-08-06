# Gemini Process Project
이 프로젝트는 Gemini API를 활용한 프로세싱 도구입니다.

## NotebookLM 로그인 자동화

Playwright를 이용해 브라우저를 자동으로 실행하고 Google 계정으로
[NotebookLM](https://notebooklm.google.com/)에 로그인한 뒤, 로그인 세션(쿠키)을
파일로 저장해 재사용할 수 있게 해주는 스크립트입니다.

### 준비

```bash
pip install -r requirements.txt
playwright install chromium

cp config.example.json config.json
# config.json을 열어 email, password 등을 입력
```

`config.json`에는 로그인 자격증명이 담기므로 git에 커밋되지 않도록
`.gitignore`에 등록되어 있습니다.

`config.json` 옵션:

| 필드 | 설명 | 기본값 |
| --- | --- | --- |
| `email` | Google 계정 이메일 (필수) | - |
| `password` | Google 계정 비밀번호 (필수) | - |
| `headless` | 헤드리스 모드 여부. 2FA 등을 직접 처리하려면 `false` 권장 | `false` |
| `storage_state_path` | 로그인 세션(쿠키)을 저장할 파일 경로 | `notebooklm_session.json` |
| `login_timeout_ms` | 로그인/2단계 인증 완료 대기 시간(ms) | `120000` |
| `notebooklm_url` | 접속할 NotebookLM URL | `https://notebooklm.google.com/` |

### 실행

```bash
# 로그인 후 세션 저장 (세션이 이미 유효하면 재사용)
python notebooklm_login.py

# 저장된 세션으로 로그인 상태만 확인 (재로그인 시도 없음)
python notebooklm_login.py --check
```

2단계 인증이나 보안 확인이 필요한 경우, `headless: false` 상태에서 열린
브라우저 창에서 직접 완료하면 스크립트가 자동으로 로그인 완료를 감지하고
세션을 저장합니다.
