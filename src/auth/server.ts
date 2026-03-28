// ============================================================
// OAuth Server — local HTTP server para callback do OAuth
// ============================================================

import http from "node:http";

export interface OAuthServerInfo {
  port: number;
  ready: boolean;
  close: () => void;
  waitForCode: () => Promise<{ code: string } | null>;
}

/**
 * Start a local HTTP server that waits for /auth/callback
 * and returns the authorization code.
 */
export function startLocalOAuthServer(state: string): Promise<OAuthServerInfo> {
  const server = http.createServer((req, res) => {
    try {
      const url = new URL(req.url || "", "http://localhost");

      if (url.pathname !== "/auth/callback") {
        res.statusCode = 404;
        res.end("Not found");
        return;
      }

      const receivedState = url.searchParams.get("state");
      if (receivedState !== state) {
        res.statusCode = 400;
        res.end("State mismatch");
        return;
      }

      const code = url.searchParams.get("code");
      if (!code) {
        res.statusCode = 400;
        res.end("Missing authorization code");
        return;
      }

      res.statusCode = 200;
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      res.end(successHtml);
      (server as http.Server & { _lastCode?: string })._lastCode = code;
    } catch {
      res.statusCode = 500;
      res.end("Internal error");
    }
  });

  return new Promise((resolve) => {
    server
      .on("error", (err: NodeJS.ErrnoException) => {
        console.error(`[oauth] Failed to bind port 1455 (${err?.code}). Falling back to manual.`);
        resolve({
          port: 1455,
          ready: false,
          close: () => { try { server.close(); } catch {} },
          waitForCode: async () => null,
        });
      })
      .listen(1455, "127.0.0.1", () => {
        resolve({
          port: 1455,
          ready: true,
          close: () => server.close(),
          waitForCode: async () => {
            for (let i = 0; i < 600; i++) { // poll every 100ms, max 60s
              const lastCode = (server as http.Server & { _lastCode?: string })._lastCode;
              if (lastCode) return { code: lastCode };
              await new Promise<void>((r) => setTimeout(r, 100));
            }
            return null;
          },
        });
      });
  });
}

const successHtml = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <title>Authorization Successful</title>
  <style>
    body { font-family: system-ui, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #e2e8f0; }
    .card { background: #1e293b; border-radius: 12px; padding: 32px; text-align: center; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.5); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin: 0 0 8px; color: #22c55e; }
    p { margin: 0; color: #94a3b8; font-size: 14px; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">✓</div>
    <h1>Authorized!</h1>
    <p>You can close this window and return to the terminal.</p>
  </div>
</body>
</html>`;
