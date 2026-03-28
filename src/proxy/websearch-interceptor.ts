// ============================================================
// WebSearch Interceptor — intercepts web_search server tool requests
// and executes them via SearXNG, returning Anthropic-format responses
// ============================================================

import { createLogger } from "../logger.js";
import { generateMsgId, makeSSE } from "./helpers.js";
import { search, type SearchResult } from "../search/searxng.js";

const logger = createLogger("[websearch]");

/**
 * Check if a request contains a web_search server tool.
 * Claude Code sends these with type "web_search_20250305" or "web_search_20260209".
 */
export function hasWebSearchTool(body: any): boolean {
  if (!body.tools || !Array.isArray(body.tools)) return false;
  return body.tools.some(
    (t: any) =>
      (typeof t.type === "string" && t.type.startsWith("web_search_")) ||
      (t.name === "web_search" && !t.input_schema),
  );
}

/**
 * Extract the search query from the request messages.
 * Claude Code typically sends: "Perform a web search for the query: <actual query>"
 */
function extractQuery(body: any): string {
  const messages = body.messages ?? [];
  for (const msg of messages) {
    if (msg.role !== "user") continue;
    const content = msg.content;
    let text = "";
    if (typeof content === "string") {
      text = content;
    } else if (Array.isArray(content)) {
      text = content
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join(" ");
    }
    // Extract query after "for the query:" prefix
    const match = text.match(/for the query:\s*(.+)/i);
    if (match) return match[1].trim();
    // Fallback: use the full text
    if (text.trim()) return text.trim();
  }
  return "";
}

function generateSrvToolId(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let id = "srvtoolu_";
  for (let i = 0; i < 20; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

function buildSearchResultBlocks(
  toolId: string,
  query: string,
  results: SearchResult[],
): any[] {
  const searchResults = results.map((r) => ({
    type: "web_search_result",
    url: r.url,
    title: r.title,
    encrypted_content: "",
    page_age: r.publishedDate ?? "",
  }));

  return [
    {
      type: "server_tool_use",
      id: toolId,
      name: "web_search",
      input: { query },
    },
    {
      type: "web_search_tool_result",
      tool_use_id: toolId,
      content: searchResults.length > 0
        ? searchResults
        : [{ type: "web_search_tool_result_error", error_code: "unavailable" }],
    },
  ];
}

/**
 * Handle a WebSearch request: execute search via SearXNG
 * and return Anthropic-format response (streaming or non-streaming).
 */
export async function handleWebSearch(body: any): Promise<Response> {
  const query = extractQuery(body);
  const isStreaming = body.stream === true;
  const msgId = generateMsgId();
  const toolId = generateSrvToolId();

  logger.info(`WebSearch intercepted: "${query.slice(0, 80)}"`);

  const results = await search(query);
  logger.info(`WebSearch results: ${results.length}`);

  const contentBlocks = buildSearchResultBlocks(toolId, query, results);

  // Add a text block with readable content for the model
  if (results.length > 0) {
    const summaryText = results
      .map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.content}`)
      .join("\n\n");
    contentBlocks.push({ type: "text", text: summaryText });
  }

  if (!isStreaming) {
    return new Response(
      JSON.stringify({
        id: msgId,
        type: "message",
        role: "assistant",
        content: contentBlocks,
        model: body.model ?? "proxy",
        stop_reason: "end_turn",
        stop_sequence: null,
        usage: {
          input_tokens: 0,
          output_tokens: 0,
          server_tool_use: { web_search_requests: 1 },
        },
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  }

  // Streaming response
  const chunks: string[] = [];

  // message_start
  chunks.push(
    makeSSE("message_start", {
      type: "message_start",
      message: {
        id: msgId,
        type: "message",
        role: "assistant",
        content: [],
        model: body.model ?? "proxy",
        stop_reason: null,
        stop_sequence: null,
        usage: { input_tokens: 0, output_tokens: 0 },
      },
    }),
  );

  chunks.push(makeSSE("ping", { type: "ping" }));

  // Block 0: server_tool_use
  chunks.push(
    makeSSE("content_block_start", {
      type: "content_block_start",
      index: 0,
      content_block: {
        type: "server_tool_use",
        id: toolId,
        name: "web_search",
      },
    }),
  );

  chunks.push(
    makeSSE("content_block_delta", {
      type: "content_block_delta",
      index: 0,
      delta: {
        type: "input_json_delta",
        partial_json: JSON.stringify({ query }),
      },
    }),
  );

  chunks.push(
    makeSSE("content_block_stop", {
      type: "content_block_stop",
      index: 0,
    }),
  );

  // Block 1: web_search_tool_result (full content in content_block_start, no deltas)
  const resultContent =
    results.length > 0
      ? results.map((r) => ({
          type: "web_search_result",
          url: r.url,
          title: r.title,
          encrypted_content: "",
          page_age: r.publishedDate ?? "",
        }))
      : [{ type: "web_search_tool_result_error", error_code: "unavailable" }];

  chunks.push(
    makeSSE("content_block_start", {
      type: "content_block_start",
      index: 1,
      content_block: {
        type: "web_search_tool_result",
        tool_use_id: toolId,
        content: resultContent,
      },
    }),
  );

  chunks.push(
    makeSSE("content_block_stop", {
      type: "content_block_stop",
      index: 1,
    }),
  );

  // Block 2: text block with readable search results for the model
  if (results.length > 0) {
    const summaryText = results
      .map((r, i) => `[${i + 1}] ${r.title}\n    URL: ${r.url}\n    ${r.content}`)
      .join("\n\n");

    chunks.push(
      makeSSE("content_block_start", {
        type: "content_block_start",
        index: 2,
        content_block: { type: "text", text: "" },
      }),
    );

    chunks.push(
      makeSSE("content_block_delta", {
        type: "content_block_delta",
        index: 2,
        delta: { type: "text_delta", text: summaryText },
      }),
    );

    chunks.push(
      makeSSE("content_block_stop", {
        type: "content_block_stop",
        index: 2,
      }),
    );
  }

  // message_delta + message_stop
  chunks.push(
    makeSSE("message_delta", {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: {
        output_tokens: 0,
        server_tool_use: { web_search_requests: 1 },
      },
    }),
  );

  chunks.push(makeSSE("message_stop", { type: "message_stop" }));

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const chunk of chunks) {
        controller.enqueue(encoder.encode(chunk));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
