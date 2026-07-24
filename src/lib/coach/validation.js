const MAX_MESSAGE_LENGTH = 500;

export function validateCoachPrompt(value) {
  if (!value || typeof value !== "object") {
    return { ok: false, error: "A request body is required." };
  }

  const message = typeof value.message === "string" ? value.message.trim() : "";
  if (!message) return { ok: false, error: "Ask the coach a question." };
  if (message.length > MAX_MESSAGE_LENGTH) {
    return { ok: false, error: `Questions must be ${MAX_MESSAGE_LENGTH} characters or fewer.` };
  }

  const allowedFocus = new Set(["slate", "props", "risk"]);
  const focus = allowedFocus.has(value.focus) ? value.focus : "slate";
  return { ok: true, value: { message, focus } };
}
