// Small, deterministic avatar helpers so a person looks the same everywhere
// (action items, people panel, history). The palette is intentionally muted —
// soft tints, not a rainbow — to stay calm and editorial.

const PALETTE = [
  { bg: "#eef0ff", fg: "#4338ca" }, // indigo
  { bg: "#e7f5ef", fg: "#047857" }, // green
  { bg: "#fdeee6", fg: "#b45309" }, // amber
  { bg: "#fbe9ef", fg: "#be123c" }, // rose
  { bg: "#e9f1fb", fg: "#1d4ed8" }, // blue
  { bg: "#f0ebfb", fg: "#7c3aed" }, // violet
];

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function avatarColor(name: string): { bg: string; fg: string } {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash * 31 + name.charCodeAt(i)) | 0;
  }
  return PALETTE[Math.abs(hash) % PALETTE.length];
}
