// ============================================================
// Proxy Server — Bun.serve + roteamento
// ============================================================

import { OPENCODE_GO_ENDPOINT } from "../constants.js";
import { createLogger } from "../logger.js";
import { convertAnthropicRequestToOpenAI } from "./request-conversion.js";
import { convertOpenAIResponseToAnthropic } from "./response-conversion.js";
import { streamOpenAIToAnthropic } from "./stream-conversion.js";

const logger = createLogger("[proxy]");

export async function startProxy(port: number, apiKey: string): Promise<void> {
  logger.info(`Starting on port ${port}`);
  logger.debug(`API Key: ${apiKey.slice(0, 10)}...`);
  logger.debug(`Endpoint: ${OPENCODE_GO_ENDPOINT}`);

  let server;
  try {
    server = Bun.serve({
      port,
      async fetch(req) {
        const url = new URL(req.url);
        logger.debug(`${req.method} ${url.pathname}`);

        // Claude Code sends HEAD / to check connectivity
        if (req.method === "HEAD" || req.method === "GET") {
          return new Response("OK", { status: 200 });
        }

        if (req.method !== "POST") {
          return new Response("Method not allowed", { status: 405 });
        }

        if (url.pathname === "/v1/messages") {
          try {
            const anthropicBody = await req.json() as any;
            const isStreaming = anthropicBody.stream === true;
            logger.debug(`Model: ${anthropicBody.model} | stream: ${isStreaming} | tools: ${anthropicBody.tools?.length ?? 0}`);

            const openaiBody = convertAnthropicRequestToOpenAI(anthropicBody);

            logger.debug(`→ ${OPENCODE_GO_ENDPOINT}`);

            const response = await fetch(OPENCODE_GO_ENDPOINT, {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json",
              },
              body: JSON.stringify(openaiBody),
            });

            logger.info(`← status ${response.status}`);

            if (!response.ok) {
              const errorText = await response.text();
              logger.error(`API error: ${errorText.slice(0, 500)}`);
              return new Response(JSON.stringify({
                type: "error",
                error: {
                  type: "api_error",
                  message: errorText,
                },
              }), {
                status: response.status,
                headers: { "Content-Type": "application/json" },
              });
            }

            // Streaming: real chunk-by-chunk conversion
            if (isStreaming) {
              const stream = new ReadableStream({
                async start(controller) {
                  let chunkCount = 0;
                  try {
                    for await (const chunk of streamOpenAIToAnthropic(response)) {
                      chunkCount++;
                      if (chunkCount <= 5) {
                        logger.debug(`SSE chunk #${chunkCount}: ${chunk.slice(0, 200).replace(/\n/g, "\\n")}`);
                      }
                      controller.enqueue(new TextEncoder().encode(chunk));
                    }
                    logger.debug(`Stream complete: ${chunkCount} chunks sent`);
                  } catch (e) {
                    logger.error(`Stream error: ${e}`);
                  } finally {
                    controller.close();
                  }
                },
              });

              return new Response(stream, {
                status: 200,
                headers: {
                  "Content-Type": "text/event-stream",
                  "Cache-Control": "no-cache",
                  "Connection": "keep-alive",
                },
              });
            }

            // Non-streaming: full conversion
            const data = await response.json() as any;
            const anthropicResponse = convertOpenAIResponseToAnthropic(data);
            logger.debug(`Response: stop_reason=${anthropicResponse.stop_reason}, blocks=${anthropicResponse.content.length}`);

            return new Response(JSON.stringify(anthropicResponse), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          } catch (e: any) {
            logger.error(`Internal error: ${e.message}`);
            return new Response(JSON.stringify({
              type: "error",
              error: {
                type: "internal_server_error",
                message: e.message,
              },
            }), {
              status: 500,
              headers: { "Content-Type": "application/json" },
            });
          }
        }

        return new Response("Not found", { status: 404 });
      },
    });
  } catch (err: any) {
    if (err.code === "EADDRINUSE" || err.message?.includes("address already in use")) {
      logger.error(`Port ${port} is already in use. Use --port to specify a different port.`);
    } else {
      logger.error(`Failed to start proxy: ${err.message}`);
    }
    process.exit(1);
  }

  logger.info(`Proxy ready at http://localhost:${server.port}`);
  logger.info("Waiting for Claude Code...");
}
