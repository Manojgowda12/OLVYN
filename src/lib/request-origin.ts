/**
 * Resolves the canonical public origin for incoming requests.
 * Guarantees that internal reverse-proxy container addresses (e.g. localhost:10000 on Render)
 * never leak into OAuth redirect URLs or HTTP redirect headers.
 */
export function getRequestOrigin(request?: Request): string {
  // 1. Reverse proxy forwarded headers from edge router (Render / Load Balancer)
  if (request) {
    const forwardedHost = request.headers.get("x-forwarded-host");
    const forwardedProto = request.headers.get("x-forwarded-proto") || "https";
    if (forwardedHost) {
      return `${forwardedProto}://${forwardedHost}`;
    }

    const host = request.headers.get("host");
    if (
      host &&
      !host.includes("localhost:10000") &&
      !host.includes("0.0.0.0:10000") &&
      !host.includes("127.0.0.1:10000")
    ) {
      const proto =
        request.headers.get("x-forwarded-proto") ||
        (host.includes("localhost") || host.includes("127.0.0.1") ? "http" : "https");
      return `${proto}://${host}`;
    }
  }

  // 2. Explicitly configured canonical app URL
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  // 3. Render service external URL (automatically provided by Render runtime)
  if (process.env.RENDER_EXTERNAL_URL) {
    return process.env.RENDER_EXTERNAL_URL.replace(/\/$/, "");
  }

  // 4. Request URL origin fallback (only if not internal container port 10000)
  if (request) {
    try {
      const parsed = new URL(request.url);
      if (
        !parsed.host.includes("localhost:10000") &&
        !parsed.host.includes("0.0.0.0:10000") &&
        !parsed.host.includes("127.0.0.1:10000")
      ) {
        return parsed.origin;
      }
    } catch {
      // ignore invalid URLs safely
    }
  }

  // 5. Default fallback: production domain if in production, otherwise local development
  return process.env.NODE_ENV === "production" ? "https://olvyn.onrender.com" : "http://localhost:3000";
}
