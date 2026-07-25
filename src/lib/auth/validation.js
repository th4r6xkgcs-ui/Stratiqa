export function validateLogin(value) {
  if (!value || typeof value !== "object") return { ok: false, error: "A request body is required." };
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const displayName = typeof value.displayName === "string" ? value.displayName.trim() : "";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (displayName.length < 2 || displayName.length > 40) return { ok: false, error: "Display name must be between 2 and 40 characters." };
  return { ok: true, value: { email, displayName } };
}
