// CORS + JSON response helpers shared by the nina-* / daybrief-* functions.
// Allowed: the production site and any local dev server on localhost / 127.0.0.1.

const PROD_ORIGIN = "https://ninaneev.github.io";
const LOCAL_ORIGIN = /^http:\/\/(localhost|127\.0\.0\.1)(:\d{1,5})?$/;

export function isAllowedOrigin(origin: string | null): boolean {
  if (!origin) return false;
  return origin === PROD_ORIGIN || LOCAL_ORIGIN.test(origin);
}

export function corsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, authorization, apikey, x-client-info",
    "Access-Control-Max-Age": "86400",
    "Vary": "Origin",
  };
  if (origin && isAllowedOrigin(origin)) {
    headers["Access-Control-Allow-Origin"] = origin;
  }
  return headers;
}

export function json(req: Request, status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders(req.headers.get("origin")),
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

/** Consistent error shape: { ok: false, error: "<code>" }. Never put secrets or upstream bodies here. */
export function jsonError(req: Request, status: number, code: string): Response {
  return json(req, status, { ok: false, error: code });
}

/** Returns a preflight response for OPTIONS, or null to continue. */
export function handlePreflight(req: Request): Response | null {
  if (req.method !== "OPTIONS") return null;
  return new Response(null, { status: 204, headers: corsHeaders(req.headers.get("origin")) });
}
