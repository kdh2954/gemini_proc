import { chromium, type Browser, type BrowserContext, type Page } from "playwright";
import { getSessionPath, hasSession } from "./session.js";

export const NOTEBOOKLM_URL = "https://notebooklm.google.com/";

/** 로그인 진행/확인 등 사용자에게 화면이 보여야 하는 경우 브라우저를 새로 띄운다. */
export async function launchBrowser(headless: boolean): Promise<Browser> {
  return chromium.launch({ headless });
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
