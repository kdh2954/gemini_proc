import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/**
 * MCP 서버는 stdio(stdin/stdout)를 프로토콜 통신에 사용하므로,
 * 디버깅용 로그를 stdout에 출력하면 안 된다. 대신 파일로 남긴다.
 *
 * 로그 파일 위치는 NOTEBOOKLM_MCP_LOG_PATH 환경 변수로 재정의할 수 있고,
 * 기본값은 세션 파일과 같은 디렉터리(~/.notebooklm-mcp/mcp-server.log)이다.
 * 로그 레벨은 NOTEBOOKLM_MCP_LOG_LEVEL(debug|info|warn|error, 기본 info)로
 * 조절한다.
 */

export type LogLevel = "debug" | "info" | "warn" | "error";

const LEVEL_ORDER: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

function resolveLogPath(): string {
  return (
    process.env.NOTEBOOKLM_MCP_LOG_PATH ||
    path.join(os.homedir(), ".notebooklm-mcp", "mcp-server.log")
  );
}

function resolveLogLevel(): LogLevel {
  const raw = (process.env.NOTEBOOKLM_MCP_LOG_LEVEL || "info").toLowerCase();
  return raw === "debug" || raw === "info" || raw === "warn" || raw === "error"
    ? raw
    : "info";
}

const logPath = resolveLogPath();
const minLevel = resolveLogLevel();
let ensuredDir = false;

function ensureLogDir(): void {
  if (ensuredDir) return;
  fs.mkdirSync(path.dirname(logPath), { recursive: true });
  ensuredDir = true;
}

function formatMeta(meta: unknown): string {
  if (meta instanceof Error) {
    return meta.stack || meta.message;
  }
  if (typeof meta === "string") {
    return meta;
  }
  try {
    return JSON.stringify(meta);
  } catch {
    return String(meta);
  }
}

function write(level: LogLevel, message: string, meta?: unknown): void {
  if (LEVEL_ORDER[level] < LEVEL_ORDER[minLevel]) {
    return;
  }

  const line =
    `[${new Date().toISOString()}] [${level.toUpperCase()}] ${message}` +
    (meta !== undefined ? ` ${formatMeta(meta)}` : "") +
    "\n";

  try {
    ensureLogDir();
    fs.appendFileSync(logPath, line);
  } catch {
    // 로그 기록 실패가 서버 동작을 막아서는 안 되므로 조용히 무시한다.
  }
}

export const logger = {
  debug: (message: string, meta?: unknown) => write("debug", message, meta),
  info: (message: string, meta?: unknown) => write("info", message, meta),
  warn: (message: string, meta?: unknown) => write("warn", message, meta),
  error: (message: string, meta?: unknown) => write("error", message, meta),
  /** 현재 로그 파일 경로 (도구 응답 등에 노출할 때 사용). */
  getLogPath: (): string => logPath,
};
