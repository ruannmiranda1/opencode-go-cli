import { describe, test, expect } from "bun:test";
import { convertAnthropicRequestToOpenAI } from "../src/proxy/request-conversion.js";

describe("convertAnthropicRequestToOpenAI", () => {
  test("converts system string to role:system message", () => {
    const body = {
      model: "minimax-m2.7",
      system: "You are helpful.",
      messages: [],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.messages[0]).toEqual({
      role: "system",
      content: "You are helpful.",
    });
  });

  test("concatenates system array text blocks with newlines", () => {
    const body = {
      model: "minimax-m2.7",
      system: [
        { type: "text", text: "Part 1" },
        { type: "text", text: "Part 2" },
      ],
      messages: [],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.messages[0]).toEqual({
      role: "system",
      content: "Part 1\nPart 2",
    });
  });

  test("converts user message with string content", () => {
    const body = {
      model: "minimax-m2.7",
      messages: [{ role: "user", content: "Hello" }],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.messages[0]).toEqual({ role: "user", content: "Hello" });
  });

  test("converts user text block to OpenAI text content", () => {
    const body = {
      model: "minimax-m2.7",
      messages: [{ role: "user", content: [{ type: "text", text: "Hello" }] }],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.messages[0]).toEqual({
      role: "user",
      content: [{ type: "text", text: "Hello" }],
    });
  });

  test("converts user image block to data URI", () => {
    const body = {
      model: "minimax-m2.7",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: "image/png", data: "abc" },
            },
          ],
        },
      ],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.messages[0].content[0]).toEqual({
      type: "image_url",
      image_url: { url: "data:image/png;base64,abc" },
    });
  });

  test("converts assistant tool_use block to tool_calls", () => {
    const body = {
      model: "minimax-m2.7",
      messages: [
        {
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "tool_1",
              name: "read_file",
              input: { path: "/tmp/test" },
            },
          ],
        },
      ],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.messages[0].tool_calls[0]).toEqual({
      id: "tool_1",
      type: "function",
      function: {
        name: "read_file",
        arguments: '{"path":"/tmp/test"}',
      },
    });
  });

  test("converts tool_result to role:tool message", () => {
    const body = {
      model: "minimax-m2.7",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "tool_1",
              content: "file content here",
            },
          ],
        },
      ],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.messages[0]).toEqual({
      role: "tool",
      tool_call_id: "tool_1",
      content: "file content here",
    });
  });

  test("converts tools array to OpenAI tools format", () => {
    const body = {
      model: "minimax-m2.7",
      tools: [
        {
          name: "read_file",
          description: "Read a file",
          input_schema: { type: "object", properties: { path: { type: "string" } } },
        },
      ],
      messages: [],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.tools[0]).toEqual({
      type: "function",
      function: {
        name: "read_file",
        description: "Read a file",
        parameters: { type: "object", properties: { path: { type: "string" } } },
      },
    });
  });

  test('maps tool_choice type:"any" to "required"', () => {
    const body = {
      model: "minimax-m2.7",
      tools: [{ name: "test", input_schema: {} }],
      tool_choice: { type: "any" },
      messages: [],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.tool_choice).toBe("required");
  });

  test("forwards max_tokens", () => {
    const body = {
      model: "minimax-m2.7",
      max_tokens: 4096,
      messages: [],
    };
    const result = convertAnthropicRequestToOpenAI(body);
    expect(result.max_tokens).toBe(4096);
  });
});
