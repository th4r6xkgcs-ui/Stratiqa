type TeamMarkProps = { name: string; size?: "sm" | "md" };

const palettes = ["violet", "mint", "gold", "cyan"];

function paletteIndex(name: string) {
  return [...name].reduce((total, character) => total + character.charCodeAt(0), 0) % palettes.length;
}

export function TeamMark({ name, size = "sm" }: TeamMarkProps) {
  const words = name.trim().split(/\s+/);
  const label = words.length > 1 ? `${words[0][0] ?? ""}${words.at(-1)?.[0] ?? ""}` : (words[0] ?? "?").slice(0, 2);
  return <span className={`team-mark team-mark--${size} team-mark--${palettes[paletteIndex(name)]}`} role="img" aria-label={`${name} team mark`}>{label}</span>;
}
