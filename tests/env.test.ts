import { describe, test, expect, beforeEach } from "bun:test";
import { buildClaudeEnv } from "../src/env.js";

beforeEach(() => {
  process.env["CLAUDE_CODE_GIT_BASH_PATH"] = "/usr/bin/bash";
  delete process.env["ANTHROPIC_API_KEY"];
  delete process.env["ANTHROPIC_ACCOUNT_ID"];
  delete process.env["CLAUDE_ACCOUNT_ID"];
});

describe("buildClaudeEnv", () => {
  test("sets ANTHROPIC_BASE_URL to the provided baseUrl", () => {
    const env = buildClaudeEnv("sk-test", "minimax-m2.7", "http://localhost:8080");
    expect(env["ANTHROPIC_BASE_URL"]).toBe("http://localhost:8080");
  });

  test("sets ANTHROPIC_AUTH_TOKEN to the provided apiKey", () => {
    const env = buildClaudeEnv("sk-test", "minimax-m2.7", "http://localhost:8080");
    expect(env["ANTHROPIC_AUTH_TOKEN"]).toBe("sk-test");
  });

  test("sets ANTHROPIC_MODEL to the provided model", () => {
    const env = buildClaudeEnv("sk-test", "minimax-m2.7", "http://localhost:8080");
    expect(env["ANTHROPIC_MODEL"]).toBe("minimax-m2.7");
  });

  test("does NOT include ANTHROPIC_API_KEY", () => {
    const env = buildClaudeEnv("sk-test", "minimax-m2.7", "http://localhost:8080");
    expect(env["ANTHROPIC_API_KEY"]).toBeUndefined();
  });

  test("sets CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC to '1'", () => {
    const env = buildClaudeEnv("sk-test", "minimax-m2.7", "http://localhost:8080");
    expect(env["CLAUDE_CODE_DISABLE_NONESSENTIAL_TRAFFIC"]).toBe("1");
  });

  test("sets CLAUDE_CONFIG_DIR when installationId is provided", () => {
    const env = buildClaudeEnv("sk-test", "minimax-m2.7", "http://localhost:8080", "my-inst");
    expect(env["CLAUDE_CONFIG_DIR"]).toMatch(/my-inst$/);
  });

  test("does NOT set CLAUDE_CONFIG_DIR when installationId is default", () => {
    const env = buildClaudeEnv("sk-test", "minimax-m2.7", "http://localhost:8080", "default");
    expect(env["CLAUDE_CONFIG_DIR"]).toBeUndefined();
  });

  test("preserves CLAUDE_CODE_GIT_BASH_PATH", () => {
    const env = buildClaudeEnv("sk-test", "minimax-m2.7", "http://localhost:8080");
    expect(env["CLAUDE_CODE_GIT_BASH_PATH"]).toBe("/usr/bin/bash");
  });
});
