import { getSessionPath, hasSession } from "../session.js";
import { launchBrowser, isLoggedInUrl, NOTEBOOKLM_URL } from "../browser.js";

export async function checkLoginStatus(): Promise<string> {
  if (!hasSession()) {
    return "저장된 로그인 세션이 없습니다. notebooklm_login 도구로 먼저 로그인하세요.";
  }

  const sessionPath = getSessionPath();
  const browser = await launchBrowser(true); // headless로 세션 유효성만 확인

  try {
    const context = await browser.newContext({ storageState: sessionPath });
    const page = await context.newPage();
    await page.goto(NOTEBOOKLM_URL, { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("networkidle").catch(() => {});

    if (isLoggedInUrl(page.url())) {
      return `로그인 세션이 유효합니다. (세션 파일: ${sessionPath})`;
    }

    return (
      "저장된 세션이 만료되었거나 더 이상 유효하지 않습니다. " +
      "notebooklm_login 도구로 다시 로그인해주세요."
    );
  } finally {
    await browser.close().catch(() => {});
  }
}
