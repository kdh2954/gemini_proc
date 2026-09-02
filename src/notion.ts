import { Client } from "@notionhq/client";
import type {
  BlockObjectRequest,
  CreatePageParameters,
} from "@notionhq/client/build/src/api-endpoints.js";

/**
 * Notion API 클라이언트를 가져옵니다.
 * 인자로 넘어온 apiKey가 있거나 환경변수 NOTION_API_KEY / NOTION_TOKEN을 사용합니다.
 */
export function getNotionClient(apiKey?: string): Client {
  const token =
    apiKey || process.env.NOTION_API_KEY || process.env.NOTION_TOKEN;

  if (!token) {
    throw new Error(
      "Notion API 키가 필요합니다. 도구 인자로 apiKey를 전달하거나 NOTION_API_KEY 환경 변수를 설정하세요."
    );
  }

  return new Client({ auth: token });
}

/**
 * 마크다운 텍스트를 Notion BlockObjectRequest 배열로 변환하는 유틸리티
 */
export function markdownToBlocks(markdown: string): BlockObjectRequest[] {
  if (!markdown || !markdown.trim()) {
    return [];
  }

  const lines = markdown.split("\n");
  const blocks: BlockObjectRequest[] = [];
  let inCodeBlock = false;
  let codeLanguage = "plain text";
  let codeContent: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // 코드 블록 처리 (``` ~ ```)
    if (line.trim().startsWith("```")) {
      if (inCodeBlock) {
        // 코드 블록 종료
        blocks.push({
          object: "block",
          type: "code",
          code: {
            rich_text: [
              {
                type: "text",
                text: { content: codeContent.join("\n").substring(0, 2000) },
              },
            ],
            language: codeLanguage as any,
          },
        });
        inCodeBlock = false;
        codeContent = [];
        codeLanguage = "plain text";
      } else {
        // 코드 블록 시작
        inCodeBlock = true;
        const langMatch = line.trim().substring(3).trim();
        codeLanguage = langMatch || "plain text";
      }
      continue;
    }

    if (inCodeBlock) {
      codeContent.push(line);
      continue;
    }

    // 빈 줄 건너뛰기
    if (!line.trim()) {
      continue;
    }

    const trimmed = line.trim();

    // 헤딩 1 (# ...)
    if (trimmed.startsWith("# ")) {
      blocks.push({
        object: "block",
        type: "heading_1",
        heading_1: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(2) } }],
        },
      });
    }
    // 헤딩 2 (## ...)
    else if (trimmed.startsWith("## ")) {
      blocks.push({
        object: "block",
        type: "heading_2",
        heading_2: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(3) } }],
        },
      });
    }
    // 헤딩 3 (### ...)
    else if (trimmed.startsWith("### ")) {
      blocks.push({
        object: "block",
        type: "heading_3",
        heading_3: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(4) } }],
        },
      });
    }
    // 인용문 (> ...)
    else if (trimmed.startsWith("> ")) {
      blocks.push({
        object: "block",
        type: "quote",
        quote: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(2) } }],
        },
      });
    }
    // 체크리스트 (- [ ] 또는 - [x])
    else if (trimmed.startsWith("- [ ] ") || trimmed.startsWith("- [x] ")) {
      const checked = trimmed.startsWith("- [x] ");
      blocks.push({
        object: "block",
        type: "to_do",
        to_do: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(6) } }],
          checked,
        },
      });
    }
    // 글머리 기호 리스트 (- ... 또는 * ...)
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      blocks.push({
        object: "block",
        type: "bulleted_list_item",
        bulleted_list_item: {
          rich_text: [{ type: "text", text: { content: trimmed.substring(2) } }],
        },
      });
    }
    // 번호 리스트 (1. ...)
    else if (/^\d+\.\s/.test(trimmed)) {
      const content = trimmed.replace(/^\d+\.\s/, "");
      blocks.push({
        object: "block",
        type: "numbered_list_item",
        numbered_list_item: {
          rich_text: [{ type: "text", text: { content } }],
        },
      });
    }
    // 기본 일반 단락 (paragraph)
    else {
      blocks.push({
        object: "block",
        type: "paragraph",
        paragraph: {
          rich_text: [{ type: "text", text: { content: trimmed } }],
        },
      });
    }
  }

  // 닫히지 않은 코드 블록 처리
  if (inCodeBlock && codeContent.length > 0) {
    blocks.push({
      object: "block",
      type: "code",
      code: {
        rich_text: [
          {
            type: "text",
            text: { content: codeContent.join("\n").substring(0, 2000) },
          },
        ],
        language: codeLanguage as any,
      },
    });
  }

  return blocks;
}

/**
 * Notion 워크스페이스 검색
 */
export async function searchNotion(query?: string, apiKey?: string) {
  const notion = getNotionClient(apiKey);
  const response = await notion.search({
    query: query || "",
    page_size: 20,
  });

  return response.results.map((item: any) => {
    const isPage = item.object === "page";
    const isDatabase = item.object === "database";

    let title = "제목 없음";
    if (isPage) {
      const titleProp = Object.values(item.properties || {}).find(
        (p: any) => p.type === "title"
      ) as any;
      if (titleProp && titleProp.title && titleProp.title.length > 0) {
        title = titleProp.title.map((t: any) => t.plain_text).join("");
      }
    } else if (isDatabase) {
      if (item.title && item.title.length > 0) {
        title = item.title.map((t: any) => t.plain_text).join("");
      }
    }

    return {
      id: item.id,
      object: item.object,
      title,
      url: item.url,
      lastEditedTime: item.last_edited_time,
    };
  });
}

/**
 * Notion 페이지 생성 (부모 페이지 또는 부모 데이터베이스 아래)
 */
export async function createNotionPage(params: {
  parentId: string;
  parentType?: "page_id" | "database_id";
  title: string;
  contentMarkdown?: string;
  apiKey?: string;
}) {
  const notion = getNotionClient(params.apiKey);
  const parentType = params.parentType || "page_id";

  const parent =
    parentType === "database_id"
      ? { database_id: params.parentId }
      : { page_id: params.parentId };

  const properties: any =
    parentType === "database_id"
      ? {
          Name: {
            title: [{ text: { content: params.title } }],
          },
        }
      : {
          title: {
            title: [{ text: { content: params.title } }],
          },
        };

  const children = params.contentMarkdown
    ? markdownToBlocks(params.contentMarkdown)
    : [];

  const page = await notion.pages.create({
    parent,
    properties,
    children,
  });

  return {
    id: page.id,
    url: (page as any).url,
    title: params.title,
  };
}

/**
 * 기존 Notion 페이지에 블록(내용) 추가
 */
export async function appendNotionContent(params: {
  pageId: string;
  contentMarkdown: string;
  apiKey?: string;
}) {
  const notion = getNotionClient(params.apiKey);
  const blocks = markdownToBlocks(params.contentMarkdown);

  if (blocks.length === 0) {
    return { addedBlockCount: 0, pageId: params.pageId };
  }

  const response = await notion.blocks.children.append({
    block_id: params.pageId,
    children: blocks,
  });

  return {
    addedBlockCount: response.results.length,
    pageId: params.pageId,
  };
}

/**
 * Notion 데이터베이스에 항목(레코드) 추가
 */
export async function addNotionDatabaseItem(params: {
  databaseId?: string;
  title: string;
  properties?: Record<string, any>;
  contentMarkdown?: string;
  apiKey?: string;
}) {
  const databaseId = params.databaseId || process.env.NOTION_DATABASE_ID;
  if (!databaseId) {
    throw new Error(
      "Notion Database ID가 필요합니다. 도구 인자로 databaseId를 전달하거나 NOTION_DATABASE_ID 환경 변수를 설정하세요."
    );
  }

  const notion = getNotionClient(params.apiKey);

  const pageProperties: any = {
    Name: {
      title: [{ text: { content: params.title } }],
    },
    ...params.properties,
  };

  const children = params.contentMarkdown
    ? markdownToBlocks(params.contentMarkdown)
    : [];

  const page = await notion.pages.create({
    parent: { database_id: databaseId },
    properties: pageProperties,
    children,
  });

  return {
    id: page.id,
    url: (page as any).url,
    title: params.title,
  };
}
