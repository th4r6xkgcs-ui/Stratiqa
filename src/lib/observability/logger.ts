type LogLevel = "info" | "warn" | "error";
type Fields = Record<string, string | number | boolean | null | undefined>;

function write(level: LogLevel, event: string, fields: Fields = {}) {
  const entry = JSON.stringify({ timestamp: new Date().toISOString(), level, service: "stratiqa-web", event, ...fields });
  if (level === "error") console.error(entry);
  else if (level === "warn") console.warn(entry);
  else console.info(entry);
}

export const logger = {
  info: (event: string, fields?: Fields) => write("info", event, fields),
  warn: (event: string, fields?: Fields) => write("warn", event, fields),
  error: (event: string, error: unknown, fields?: Fields) => write("error", event, { ...fields, error: error instanceof Error ? error.message : "Unknown error" }),
};

export function requestId(request: Request) {
  return request.headers.get("x-request-id") ?? crypto.randomUUID();
}
