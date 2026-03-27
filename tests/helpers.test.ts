import { describe, test, expect } from "bun:test";
import {
  generateMsgId,
  mapStopReason,
  convertImageSource,
} from "../src/proxy/helpers.js";

describe("generateMsgId", () => {
  test("returns a string starting with 'msg_'", () => {
    const id = generateMsgId();
    expect(id.startsWith("msg_")).toBe(true);
  });

  test("generates unique IDs on successive calls", () => {
    const id1 = generateMsgId();
    const id2 = generateMsgId();
    expect(id1).not.toBe(id2);
  });
});

describe("mapStopReason", () => {
  test('maps "stop" to "end_turn"', () => {
    expect(mapStopReason("stop")).toBe("end_turn");
  });

  test('maps "tool_calls" to "tool_use"', () => {
    expect(mapStopReason("tool_calls")).toBe("tool_use");
  });

  test('maps "length" to "max_tokens"', () => {
    expect(mapStopReason("length")).toBe("max_tokens");
  });

  test('maps unknown value to "end_turn" (default)', () => {
    expect(mapStopReason("unknown")).toBe("end_turn");
  });

  test("maps null to 'end_turn'", () => {
    expect(mapStopReason(null)).toBe("end_turn");
  });

  test("maps undefined to 'end_turn'", () => {
    expect(mapStopReason(undefined)).toBe("end_turn");
  });
});

describe("convertImageSource", () => {
  test("converts base64 source to data URI", () => {
    const source = { type: "base64", media_type: "image/png", data: "abc123" };
    expect(convertImageSource(source)).toBe("data:image/png;base64,abc123");
  });

  test("passes through URL source", () => {
    const source = { url: "https://example.com/img.png" };
    expect(convertImageSource(source)).toBe("https://example.com/img.png");
  });

  test("returns empty string for null source", () => {
    expect(convertImageSource(null)).toBe("");
  });
});
