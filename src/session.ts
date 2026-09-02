import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * 로그인 세션(Playwright storageState)이 저장되는 위치.
 * 저장소 바깥(사용자 홈 디렉터리)에 저장해 쿠키/세션 정보가
 * 실수로 git에 커밋되는 일을 방지한다.
 * NOTEBOOKLM_MCP_SESSION_PATH 환경 변수로 재정의할 수 있다.
 */
export function getSessionPath(): string {
  return (
    process.env.NOTEBOOKLM_MCP_SESSION_PATH ||
    path.join(os.homedir(), ".notebooklm-mcp", "auth.json")
  );
}

export function hasSession(): boolean {
  return fs.existsSync(getSessionPath());
}

export function ensureSessionDir(): void {
  const dir = path.dirname(getSessionPath());
  fs.mkdirSync(dir, { recursive: true });
}

export function clearSession(): boolean {
  const sessionPath = getSessionPath();
  if (!fs.existsSync(sessionPath)) {
    return false;
  }
  fs.unlinkSync(sessionPath);
  return true;
}
