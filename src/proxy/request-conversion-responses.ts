// ============================================================
// Request Conversion — Anthropic → OpenAI Responses API
// ============================================================

import { convertImageSource } from "./helpers.js";

export function convertAnthropicRequestToResponses(body: any): any {
  // 1. System prompt → instructions (top-level)
  let instructions: string | undefined;
  if (body.system) {
    if (typeof body.system === "string") {
      instructions = body.system;
    } else if (Array.isArray(body.system)) {
      instructions = body.system
        .filter((b: any) => b.type === "text")
        .map((b: any) => b.text)
        .join("\n");
    } else {
      instructions = String(body.system);
    }
  }

  // 2. Messages → input[] (typed items)
  const input: any[] = [];

  for (const msg of body.messages ?? []) {
    const role = msg.role;
    const content = msg.content;

    if (role === "user") {
      if (typeof content === "string") {
        input.push({
          type: "message",
          role: "user",
          content: [{ type: "input_text", text: content }],
        });
        continue;
      }

      if (Array.isArray(content)) {
        const hasToolResult = content.some((b: any) => b.type === "tool_result");

        if (hasToolResult) {
          // tool_results become function_call_output items
          const textParts: any[] = [];
          for (const block of content) {
            if (block.type === "tool_result") {
              let output = "";
              if (typeof block.content === "string") {
                output = block.content;
              } else if (Array.isArray(block.content)) {
                output = block.content
                  .filter((c: any) => c.type === "text")
                  .map((c: any) => c.text)
                  .join(" ");
              }
              input.push({
                type: "function_call_output",
                call_id: block.tool_use_id,
                output: output || "Success",
              });
            } else if (block.type === "text" && block.text) {
              textParts.push({ type: "input_text", text: block.text });
            }
          }
          if (textParts.length > 0) {
            input.push({
              type: "message",
              role: "user",
              content: textParts,
            });
          }
        } else {
          // Normal user content blocks
          const contentItems: any[] = [];
          for (const block of content) {
            if (block.type === "text") {
              contentItems.push({ type: "input_text", text: block.text });
            } else if (block.type === "image") {
              contentItems.push({
                type: "input_image",
                image_url: convertImageSource(block.source),
              });
            }
          }
          input.push({
            type: "message",
            role: "user",
            content: contentItems,
          });
        }
      }
    } else if (role === "assistant") {
      if (typeof content === "string") {
        input.push({
          type: "message",
          role: "assistant",
          content: [{ type: "output_text", text: content }],
        });
        continue;
      }

      if (Array.isArray(content)) {
        const outputContent: any[] = [];
        for (const block of content) {
          if (block.type === "text") {
            outputContent.push({ type: "output_text", text: block.text });
          } else if (block.type === "tool_use") {
            // Close the message if we have text, then add function_call as separate item
            if (outputContent.length > 0) {
              input.push({
                type: "message",
                role: "assistant",
                content: [...outputContent],
              });
              outputContent.length = 0;
            }
            input.push({
              type: "function_call",
              call_id: block.id,
              name: block.name,
              arguments: JSON.stringify(block.input),
            });
          }
        }
        // Push remaining text content
        if (outputContent.length > 0) {
          input.push({
            type: "message",
            role: "assistant",
            content: outputContent,
          });
        }
      }
    }
  }

  // 3. Tools — flat format (no function wrapper)
  const tools: any[] = [];
  if (body.tools) {
    for (const tool of body.tools) {
      let params = tool.input_schema;

      // Some Claude Code tools (like web_search) arrive without input_schema.
      // The Responses API needs a schema for the model to generate proper arguments.
      if (!params || !params.properties || Object.keys(params.properties).length === 0) {
        params = {
          type: "object",
          properties: {
            query: { type: "string", description: "The search query or input" },
          },
          required: ["query"],
        };
      }

      tools.push({
        type: "function",
        name: tool.name,
        description: tool.description ?? "",
        parameters: params,
        strict: false,
      });
    }
  }

  // 4. Build final body
  const responsesBody: any = {
    model: body.model,
    input,
    stream: true, // Codex backend requires stream=true
    store: false,
  };

  if (instructions) {
    responsesBody.instructions = instructions;
  }

  // Note: temperature and top_p are not supported by the Codex backend

  if (tools.length > 0) {
    responsesBody.tools = tools;

    if (body.tool_choice) {
      const tc = body.tool_choice;
      if (tc.type === "any") responsesBody.tool_choice = "required";
      else if (tc.type === "auto") responsesBody.tool_choice = "auto";
      else if (tc.type === "tool") {
        responsesBody.tool_choice = {
          type: "function",
          name: tc.name,
        };
      }
    }
  }

  return responsesBody;
}
