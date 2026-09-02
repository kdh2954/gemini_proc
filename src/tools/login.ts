import fs from "node:fs";
import type { Page, BrowserContext } from "playwright";
import { launchBrowser, NOTEBOOKLM_URL } from "../browser.js";
import { ensureSessionDir, getSessionPath } from "../session.js";
import { logger } from "../logger.js";

const DEFAULT_TIMEOUT_MS = 5 * 60 * 1000; // 5분
const POLL_INTERVAL_MS = 1500;

// 구글 로그인이 성공하면 .google.com 도메인에 이 쿠키들 중 하나 이상이 생긴다.
// UI 텍스트/셀렉터에 의존하지 않기 때문에 NotebookLM 화면이 바뀌어도 안정적으로 동작한다.
const AUTH_COOKIE_NAMES = new Set([
  "SID",
  "SSID",
  "HSID",
  "SAPISID",
  "__Secure-1PSID",
  "__Secure-3PSID",
]);

async function waitForLogin(
  context: BrowserContext,
  page: Page,
  timeoutMs: number
): Promise<void> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    if (page.isClosed()) {
      logger.warn("로그인 창이 완료되기 전에 닫힘");
      throw new Error(
        "로그인 창이 완료되기 전에 닫혔습니다. notebooklm_login을 다시 실행해주세요."
      );
    }

    const url = page.url();
    const onNotebookLM = (() => {
      try {
        return new URL(url).hostname === "notebooklm.google.com";
      } catch {
        return false;
      }
    })();

    if (onNotebookLM) {
      const cookies = await context.cookies();
      const loggedIn = cookies.some((c) => AUTH_COOKIE_NAMES.has(c.name));
      if (loggedIn) {
        return;
      }
    }

    await page.waitForTimeout(POLL_INTERVAL_MS);
  }

  logger.warn(`로그인 대기 시간 초과 (${Math.round(timeoutMs / 1000)}초)`);
  throw new Error(
    `로그인 대기 시간(${Math.round(timeoutMs / 1000)}초)을 초과했습니다. ` +
      "브라우저 창에서 로그인을 완료한 뒤 notebooklm_login을 다시 실행해주세요."
  );
}

export async function performLogin(timeoutMs = DEFAULT_TIMEOUT_MS): Promise<string> {
  const browser = await launchBrowser(false); // headed: 사용자가 직접 로그인해야 함

  try {
    const context = await browser.newContext();
    const page = await context.newPage();

    await page.goto(NOTEBOOKLM_URL, { waitUntil: "domcontentloaded" });
    await waitForLogin(context, page, timeoutMs);

    // 로그인 직후 리다이렉트/렌더링이 안정될 때까지 잠깐 대기
    await page.waitForLoadState("networkidle").catch(() => {});

    ensureSessionDir();
    const sessionPath = getSessionPath();
    await context.storageState({ path: sessionPath });
    logger.info(`로그인 세션 저장 완료: ${sessionPath}`);

    return `NotebookLM 로그인에 성공했습니다. 세션이 저장되었습니다: ${sessionPath}`;
  } finally {
    await browser.close().catch(() => {});
  }
}

export function sessionFileExists(): boolean {
  return fs.existsSync(getSessionPath());
}
