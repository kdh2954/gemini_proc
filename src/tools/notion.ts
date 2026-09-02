import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import {
  searchNotion,
  createNotionPage,
  appendNotionContent,
  addNotionDatabaseItem,
} from "../notion.js";

/**
 * McpServer 인스턴스에 Notion 관련 도구들을 등록합니다.
 */
export function registerNotionTools(server: McpServer): void {
  // 1. Notion 검색 도구
  server.registerTool(
    "notion_search",
    {
      title: "Notion 워크스페이스 검색",
      description:
        "Notion 워크스페이스 내에서 지정된 키워드로 페이지 및 데이터베이스를 검색합니다.",
      inputSchema: {
        query: z
          .string()
          .optional()
          .describe("검색할 키워드. 생략 시 최근 항목 조회"),
        apiKey: z
          .string()
          .optional()
          .describe("Notion API 키. 생략 시 NOTION_API_KEY 환경변수 사용"),
      },
    },
    async ({ query, apiKey }) => {
      try {
        const results = await searchNotion(query, apiKey);
        return {
          content: [
            {
              type: "text",
              text: JSON.stringify(results, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Notion 검색 실패: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 2. Notion 페이지 생성 도구
  server.registerTool(
    "notion_create_page",
    {
      title: "Notion 페이지 생성",
      description:
        "Notion 부모 페이지 또는 데이터베이스 아래에 새로운 페이지(노트)를 생성합니다. 마크다운 형식 본문을 포함할 수 있습니다.",
      inputSchema: {
        parentId: z
          .string()
          .describe("부모 페이지 ID 또는 부모 데이터베이스 ID"),
        parentType: z
          .enum(["page_id", "database_id"])
          .optional()
          .default("page_id")
          .describe("부모 타입 ('page_id' 또는 'database_id'). 기본값 'page_id'"),
        title: z.string().describe("생성할 페이지 제목"),
        contentMarkdown: z
          .string()
          .optional()
          .describe("페이지에 포함할 마크다운 본문 내용"),
        apiKey: z
          .string()
          .optional()
          .describe("Notion API 키. 생략 시 NOTION_API_KEY 환경변수 사용"),
      },
    },
    async ({ parentId, parentType, title, contentMarkdown, apiKey }) => {
      try {
        const result = await createNotionPage({
          parentId,
          parentType,
          title,
          contentMarkdown,
          apiKey,
        });
        return {
          content: [
            {
              type: "text",
              text: `Notion 페이지 생성 성공!\n제목: ${result.title}\nID: ${result.id}\nURL: ${result.url}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Notion 페이지 생성 실패: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 3. Notion 기존 페이지에 내용 추가 도구
  server.registerTool(
    "notion_append_content",
    {
      title: "Notion 페이지 내용 추가",
      description:
        "기존 Notion 페이지 하단에 마크다운 텍스트를 Notion 블록으로 변환하여 추가합니다.",
      inputSchema: {
        pageId: z.string().describe("내용을 추가할 Notion 페이지 ID"),
        contentMarkdown: z
          .string()
          .describe("추가할 마크다운 본문 내용"),
        apiKey: z
          .string()
          .optional()
          .describe("Notion API 키. 생략 시 NOTION_API_KEY 환경변수 사용"),
      },
    },
    async ({ pageId, contentMarkdown, apiKey }) => {
      try {
        const result = await appendNotionContent({
          pageId,
          contentMarkdown,
          apiKey,
        });
        return {
          content: [
            {
              type: "text",
              text: `Notion 페이지 내용 추가 완료! (추가된 블록 수: ${result.addedBlockCount})`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Notion 페이지 내용 추가 실패: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );

  // 4. Notion 데이터베이스 레코드 추가 도구
  server.registerTool(
    "notion_add_database_item",
    {
      title: "Notion 데이터베이스 레코드 추가",
      description:
        "Notion 데이터베이스에 새로운 항목(페이지)을 생성하고 본문 및 속성을 설정합니다.",
      inputSchema: {
        databaseId: z
          .string()
          .optional()
          .describe(
            "Notion 데이터베이스 ID. 생략 시 NOTION_DATABASE_ID 환경변수 사용"
          ),
        title: z.string().describe("항목 제목 (Name 속성)"),
        contentMarkdown: z
          .string()
          .optional()
          .describe("항목 본문에 추가할 마크다운 내용"),
        apiKey: z
          .string()
          .optional()
          .describe("Notion API 키. 생략 시 NOTION_API_KEY 환경변수 사용"),
      },
    },
    async ({ databaseId, title, contentMarkdown, apiKey }) => {
      try {
        const result = await addNotionDatabaseItem({
          databaseId,
          title,
          contentMarkdown,
          apiKey,
        });
        return {
          content: [
            {
              type: "text",
              text: `Notion 데이터베이스 항목 추가 성공!\n제목: ${result.title}\nID: ${result.id}\nURL: ${result.url}`,
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: "text",
              text: `Notion 데이터베이스 항목 추가 실패: ${(error as Error).message}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
