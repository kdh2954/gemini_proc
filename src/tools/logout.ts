import { clearSession, getSessionPath } from "../session.js";

export function performLogout(): string {
  const sessionPath = getSessionPath();
  const removed = clearSession();

  return removed
    ? `저장된 로그인 세션을 삭제했습니다: ${sessionPath}`
    : "삭제할 로그인 세션이 없습니다. 이미 로그아웃 상태입니다.";
}
