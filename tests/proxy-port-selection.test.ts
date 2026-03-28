import { describe, expect, test } from "bun:test";
import { DEFAULT_PROXY_PORT, PROXY_PORT_FALLBACK_ATTEMPTS } from "../src/constants.js";

function getPreferredPort(portOverride?: number, configProxyPort?: number): number {
  return portOverride ?? configProxyPort ?? DEFAULT_PROXY_PORT;
}

function getPortCandidates(startPort: number, attempts: number): number[] {
  return Array.from({ length: attempts }, (_, index) => startPort + index);
}

describe("proxy port selection", () => {
  test("uses port override before config and default", () => {
    expect(getPreferredPort(9090, 8085)).toBe(9090);
  });

  test("uses config port when override is missing", () => {
    expect(getPreferredPort(undefined, 8085)).toBe(8085);
  });

  test("falls back to default port when override and config are missing", () => {
    expect(getPreferredPort()).toBe(DEFAULT_PROXY_PORT);
  });

  test("builds sequential fallback candidates from preferred port", () => {
    expect(getPortCandidates(8080, 4)).toEqual([8080, 8081, 8082, 8083]);
  });

  test("uses configured retry range size", () => {
    const candidates = getPortCandidates(DEFAULT_PROXY_PORT, PROXY_PORT_FALLBACK_ATTEMPTS);
    expect(candidates).toHaveLength(PROXY_PORT_FALLBACK_ATTEMPTS);
    expect(candidates[0]).toBe(DEFAULT_PROXY_PORT);
    expect(candidates.at(-1)).toBe(DEFAULT_PROXY_PORT + PROXY_PORT_FALLBACK_ATTEMPTS - 1);
  });
});
