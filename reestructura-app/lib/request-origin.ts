function normalizeOrigin(origin: string) {
  return origin.replace(/\/$/, "");
}

export function getConfiguredAppOrigin() {
  const fromEnv = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (fromEnv?.startsWith("http")) {
    return normalizeOrigin(fromEnv);
  }
  return null;
}

/** Origen público de la app en Route Handlers (Vercel / proxies). */
export function resolveRequestOrigin(request: Request) {
  const { origin: urlOrigin } = new URL(request.url);

  if (process.env.NODE_ENV === "development") {
    return urlOrigin;
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost) {
    const proto = forwardedProto || "https";
    return `${proto}://${forwardedHost}`;
  }

  return getConfiguredAppOrigin() ?? urlOrigin;
}
