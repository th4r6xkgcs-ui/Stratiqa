export function validateLogin(value) {
  if (!value || typeof value !== "object") return { ok: false, error: "A request body is required." };
  const email = typeof value.email === "string" ? value.email.trim().toLowerCase() : "";
  const displayName = typeof value.displayName === "string" ? value.displayName.trim() : "";
  const password = typeof value.password === "string" ? value.password : "";
  const action = value.action === "signup" ? "signup" : "login";
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { ok: false, error: "Enter a valid email address." };
  if (action === "signup" && (displayName.length < 2 || displayName.length > 40)) return { ok: false, error: "Display name must be between 2 and 40 characters." };
  if (password && password.length < 8) return { ok: false, error: "Password must contain at least 8 characters." };
  return { ok: true, value: { email, displayName, password, action } };
}
