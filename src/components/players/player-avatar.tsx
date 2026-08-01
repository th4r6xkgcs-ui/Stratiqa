"use client";

type PlayerAvatarProps = {
  name: string;
  sportKey?: string;
  size?: "sm" | "md";
};

const positions = ["0% 0%", "100% 0%", "0% 100%", "100% 100%"];

function avatarIndex(name: string, sportKey?: string) {
  return [...`${name}:${sportKey ?? ""}`].reduce((total, character) => total + character.charCodeAt(0), 0) % positions.length;
}

export function PlayerAvatar({ name, sportKey, size = "md" }: PlayerAvatarProps) {
  return <span
    className={`player-avatar player-avatar--${size}`}
    role="img"
    aria-label={`Illustrated avatar for ${name}`}
    style={{ backgroundPosition: positions[avatarIndex(name, sportKey)] }}
  />;
}
