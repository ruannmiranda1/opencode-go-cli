// ============================================================
// Response Conversion — OpenAI → Anthropic (non-streaming)
// ============================================================

import { generateMsgId, mapStopReason } from "./helpers.js";

export function convertOpenAIResponseToAnthropic(openaiResp: any): any {
  const choice = openaiResp.choices?.[0];
  const message = choice?.message;
  const contentBlocks: any[] = [];

  if (message?.content) {
    contentBlocks.push({ type: "text", text: message.content });
  }

  if (message?.tool_calls) {
    for (const tc of message.tool_calls) {
      let input: any = {};
      try {
        input = JSON.parse(tc.function.arguments);
      } catch {}
      contentBlocks.push({
        type: "tool_use",
        id: tc.id,
        name: tc.function.name,
        input,
      });
    }
  }

  return {
    id: openaiResp.id ? openaiResp.id.replace("chatcmpl", "msg") : generateMsgId(),
    type: "message",
    role: "assistant",
    content: contentBlocks,
    model: openaiResp.model ?? "",
    stop_reason: mapStopReason(choice?.finish_reason),
    stop_sequence: null,
    usage: {
      input_tokens: openaiResp.usage?.prompt_tokens ?? 0,
      output_tokens: openaiResp.usage?.completion_tokens ?? 0,
      cache_creation_input_tokens: 0,
      cache_read_input_tokens: 0,
    },
  };
}
