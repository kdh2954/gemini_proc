#!/usr/bin/env node
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { performLogin } from "./tools/login.js";
import { checkLoginStatus } from "./tools/status.js";
import { performLogout } from "./tools/logout.js";

const server = new McpServer({
  name: "notebooklm-mcp",
  version: "0.1.0",
});

server.registerTool(
  "notebooklm_login",
  {
    title: "NotebookLM 로그인",
    description:
      "브라우저 창을 띄워 Google 계정으로 NotebookLM에 로그인합니다. " +
      "사용자가 직접 브라우저에서 로그인을 완료하면(2단계 인증 포함) " +
      "세션을 로컬 파일에 저장해 이후 도구 호출에서 재사용합니다.",
    inputSchema: {
      timeoutSeconds: z
        .number()
        .int()
        .positive()
        .max(1800)
        .optional()
        .describe("로그인을 기다리는 최대 시간(초). 기본값 300초(5분)."),
    },
  },
  async ({ timeoutSeconds }) => {
    try {
      const message = await performLogin(
        timeoutSeconds ? timeoutSeconds * 1000 : undefined
      );
      return { content: [{ type: "text", text: message }] };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `로그인 실패: ${(error as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "notebooklm_login_status",
  {
    title: "NotebookLM 로그인 상태 확인",
    description:
      "저장된 로그인 세션이 있는지, 그리고 아직 유효한지 headless 브라우저로 확인합니다.",
    inputSchema: {},
  },
  async () => {
    try {
      const message = await checkLoginStatus();
      return { content: [{ type: "text", text: message }] };
    } catch (error) {
      return {
        content: [
          {
            type: "text",
            text: `상태 확인 실패: ${(error as Error).message}`,
          },
        ],
        isError: true,
      };
    }
  }
);

server.registerTool(
  "notebooklm_logout",
  {
    title: "NotebookLM 로그아웃",
    description: "로컬에 저장된 NotebookLM 로그인 세션 파일을 삭제합니다.",
    inputSchema: {},
  },
  async () => {
    try {
      const message = performLogout();
      return { content: [{ type: "text", text: message }] };
    } catch (error) {
      return {
        content: [
          { type: "text", text: `로그아웃 실패: ${(error as Error).message}` },
        ],
        isError: true,
      };
    }
  }
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
}

main().catch((error) => {
  console.error("notebooklm-mcp 서버 시작 실패:", error);
  process.exit(1);
});
