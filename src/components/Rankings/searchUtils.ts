// src/components/Rankings/searchUtils.ts
import type { Player, Position } from "../../models/Player";

export function normalizeForSearch(s: string) {
  return String(s || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/-/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export type SearchMatch = {
  id: string;
  name: string;
  pos: Position;
  rankLabel: string;
};

export function buildSearchMatches(args: {
  query: string;
  idsForTab: string[];
  playersById: Record<string, Player>;
  isOverall: boolean;
  rankingIds: string[]; // full overall ordering (for overall rank label)
  limit?: number;
}): SearchMatch[] {
  const { query, idsForTab, playersById, isOverall, rankingIds, limit = 12 } =
    args;

  const q = normalizeForSearch(query);
  if (!q) return [];

  const out: SearchMatch[] = [];

  for (let i = 0; i < idsForTab.length; i++) {
    const id = idsForTab[i];
    const p = playersById[id];
    if (!p) continue;

    const nameN = normalizeForSearch(p.name);
    if (!nameN.includes(q)) continue;

    const rankLabel = isOverall
      ? String(rankingIds.indexOf(id) + 1)
      : String(i + 1);

    out.push({ id, name: p.name, pos: p.position, rankLabel });
    if (out.length >= limit) break;
  }

  return out;
}
