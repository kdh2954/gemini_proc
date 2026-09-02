import { webkit, type Browser, type BrowserContext, type Page } from "playwright";
import { getSessionPath, hasSession } from "./session.js";

export const NOTEBOOKLM_URL = "https://notebooklm.google.com/";

/**
 * 로그인 진행/확인 등 사용자에게 화면이 보여야 하는 경우 브라우저를 새로 띄운다.
 *
 * 주의(미검증): Chromium 계열(번들 Chromium, 실제 Chrome 모두)로 Google에
 * 로그인하면 "브라우저 또는 앱이 안전하지 않을 수 있습니다" 오류로 차단되는
 * 경우가 있어 WebKit(Safari와 같은 렌더링 엔진)으로 바꿔봤으나, 테스트 중
 * 로그인 화면 자체가 끝까지 진행되지 않아 이 방식으로 로그인이 실제로
 * 성공하는지는 확인하지 못했다. (Playwright는 Safari.app 자체를 구동할 수는
 * 없고, 같은 엔진의 테스트용 WebKit 브라우저를 띄운다.) NotebookLM 자동화가
 * 필요하면 이 저장소의 자체 로그인 대신 공식 `nlm` CLI/MCP 사용을 권장한다.
 * (README 참고)
 */
export async function launchBrowser(headless: boolean): Promise<Browser> {
  return webkit.launch({ headless });
}

/**
 * 저장된 로그인 세션(storageState)을 불러와 컨텍스트를 만든다.
 * 세션이 없으면 notebooklm_login 도구를 먼저 실행하라는 에러를 던진다.
 */
export async function openSessionContext(
  headless = true
): Promise<{ browser: Browser; context: BrowserContext; page: Page }> {
  if (!hasSession()) {
    throw new Error(
      "저장된 NotebookLM 로그인 세션이 없습니다. 먼저 notebooklm_login 도구를 실행해 로그인하세요."
    );
  }

  const browser = await launchBrowser(headless);
  const context = await browser.newContext({ storageState: getSessionPath() });
  const page = await context.newPage();
  return { browser, context, page };
}

/** 현재 페이지가 로그인된 NotebookLM 화면인지, 로그인 페이지로 튕겨나갔는지 판단한다. */
export function isLoggedInUrl(url: string): boolean {
  try {
    const { hostname } = new URL(url);
    return hostname === "notebooklm.google.com";
  } catch {
    return false;
  }
}
