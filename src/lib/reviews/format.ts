export function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function relativeTime(iso: string): string {
  const t = new Date(iso).getTime();
  if (Number.isNaN(t)) return "";
  const diffSec = (Date.now() - t) / 1000;
  const day = 86_400;
  if (diffSec < day) return "today";
  if (diffSec < day * 7) {
    const d = Math.round(diffSec / day);
    return `${d} day${d === 1 ? "" : "s"} ago`;
  }
  if (diffSec < day * 30) {
    const w = Math.round(diffSec / (day * 7));
    return `${w} week${w === 1 ? "" : "s"} ago`;
  }
  if (diffSec < day * 365) {
    const m = Math.round(diffSec / (day * 30));
    return `${m} month${m === 1 ? "" : "s"} ago`;
  }
  const y = Math.round(diffSec / (day * 365));
  return `${y} year${y === 1 ? "" : "s"} ago`;
}
