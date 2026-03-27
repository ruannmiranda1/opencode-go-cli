// ============================================================
// Helpers — utilities puras compartilhadas por todos os converters
// DRY central point: generateMsgId, mapStopReason, makeSSE, convertImageSource
// ============================================================

export function generateMsgId(): string {
  return "msg_" + Math.random().toString(36).substring(2, 26);
}

export function mapStopReason(finishReason: string | null | undefined): string {
  switch (finishReason) {
    case "stop": return "end_turn";
    case "tool_calls": return "tool_use";
    case "length": return "max_tokens";
    default: return "end_turn";
  }
}

export function makeSSE(event: string, data: any): string {
  return `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
}

export function convertImageSource(source: any): string {
  if (source?.type === "base64") {
    return `data:${source.media_type};base64,${source.data}`;
  }
  return source?.url ?? "";
}
