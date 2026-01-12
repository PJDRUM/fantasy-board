// src/utils/xlsxRankings.ts
import type { Player, Position } from "../models/Player";

export type TiersByPos = Record<Position, string[]>;
// tiersByPos[pos] = ordered list of playerIds that START a new tier (Tier 2+).

function cleanStr(v: unknown): string {
  return String(v ?? "").trim();
}

function csvEscape(v: string): string {
  const s = String(v ?? "");
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cur = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];

    if (inQuotes) {
      if (ch === '"') {
        const next = text[i + 1];
        if (next === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        cur += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
      continue;
    }

    if (ch === ",") {
      row.push(cur);
      cur = "";
      continue;
    }

    if (ch === "\n") {
      row.push(cur);
      rows.push(row);
      row = [];
      cur = "";
      continue;
    }

    if (ch === "\r") continue;

    cur += ch;
  }

  row.push(cur);
  rows.push(row);

  while (rows.length && rows[rows.length - 1].every((c) => cleanStr(c) === "")) rows.pop();
  return rows;
}

function normalizeTierBreaks(pos: Position, breaks: string[]): string[] {
  const cleaned = (breaks ?? []).map((x) => cleanStr(x)).filter(Boolean);
  const out: string[] = [];
  const seen = new Set<string>();
  for (const id of cleaned) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  return out;
}

function safePos(v: unknown): Position | null {
  const p = String(v ?? "").trim().toUpperCase();
  if (p === "QB" || p === "RB" || p === "WR" || p === "TE") return p as Position;
  return null;
}

function slugifyId(name: string) {
  return String(name || "")
    .toLowerCase()
    .trim()
    .replace(/'/g, "")
    .replace(/\./g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function ensureUniqueId(baseId: string, taken: Set<string>) {
  const base = baseId || "player";
  if (!taken.has(base)) return base;
  let n = 2;
  while (taken.has(`${base}-${n}`)) n++;
  return `${base}-${n}`;
}

function computeTierNumberById(args: {
  rankingIds: string[];
  playersById: Record<string, Player>;
  tiersByPos: TiersByPos;
}): Record<string, number> {
  const { rankingIds, playersById, tiersByPos } = args;

  const posLists: Record<Position, string[]> = { QB: [], RB: [], WR: [], TE: [] };
  for (const id of rankingIds) {
    const p = playersById[id];
    if (!p) continue;
    posLists[p.position].push(id);
  }

  const tierNumById: Record<string, number> = {};
  (["QB", "RB", "WR", "TE"] as Position[]).forEach((pos) => {
    const ids = posLists[pos];
    const breaks = normalizeTierBreaks(pos, tiersByPos[pos] ?? []);
    const breakSet = new Set(breaks);

    let tier = 1;
    for (const id of ids) {
      if (breakSet.has(id)) tier += 1;
      tierNumById[id] = tier;
    }
  });

  return tierNumById;
}

export function exportRankingsCsv(args: {
  rankingIds: string[];
  playersById: Record<string, Player>;
  tiersByPos: TiersByPos;
}): string {
  const { rankingIds, playersById, tiersByPos } = args;

  const tierNumById = computeTierNumberById({ rankingIds, playersById, tiersByPos });

  const header = ["rank", "id", "name", "position", "tier"];
  const lines: string[] = [header.join(",")];

  for (let i = 0; i < rankingIds.length; i++) {
    const id = rankingIds[i];
    const p = playersById[id];
    if (!p) continue;

    const row = [
      String(i + 1),
      p.id,
      p.name,
      p.position,
      String(tierNumById[p.id] ?? 1),
    ].map(csvEscape);

    lines.push(row.join(","));
  }

  return lines.join("\n");
}

export function importRankingsCsv(args: {
  csvText: string;
}): { rankingIds: string[]; tiersByPos: TiersByPos; players: Player[] } {
  const { csvText } = args;

  const rows = parseCsv(csvText);
  if (rows.length === 0) {
    return { rankingIds: [], tiersByPos: { QB: [], RB: [], WR: [], TE: [] }, players: [] };
  }

  const header = rows[0].map((h) => cleanStr(h).toLowerCase());

  const idxId = header.findIndex((h) => h === "id" || h === "playerid" || h === "player_id");
  const idxName = header.findIndex((h) => h === "name" || h === "player_name" || h === "full_name");
  const idxPos = header.findIndex((h) => h === "position" || h === "pos");
  const idxTier = header.findIndex((h) => h === "tier");

  if (idxId < 0 && idxName < 0) {
    throw new Error("CSV must include at least an 'id' or 'name' column.");
  }
  if (idxPos < 0) {
    throw new Error("CSV must include a 'position' (or 'pos') column.");
  }

  const rankingIdsRaw: string[] = [];
  const tierByIdFromFile: Record<string, number> = {};
  const playersById: Record<string, Player> = {};

  const taken = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const r = rows[i];
    if (!r || r.length === 0) continue;

    const name = idxName >= 0 ? cleanStr(r[idxName]) : "";
    const pos = safePos(idxPos >= 0 ? r[idxPos] : "");
    if (!pos) continue;

    let id = idxId >= 0 ? cleanStr(r[idxId]) : "";
    if (!id) {
      // fallback: derive an id from name
      id = ensureUniqueId(slugifyId(name), taken);
    } else {
      id = ensureUniqueId(id, taken);
    }

    taken.add(id);

    // Create/record player
    if (!playersById[id]) {
      playersById[id] = {
        id,
        name: name || id,
        position: pos,
        imageUrl: "",
      };
    }

    rankingIdsRaw.push(id);

    const tierRaw = idxTier >= 0 ? cleanStr(r[idxTier]) : "";
    const tierNum = tierRaw ? Number(tierRaw) : 1;
    tierByIdFromFile[id] = Number.isFinite(tierNum) && tierNum >= 1 ? tierNum : 1;
  }

  // de-dupe preserve order
  const rankingIds: string[] = [];
  const seen = new Set<string>();
  for (const id of rankingIdsRaw) {
    if (seen.has(id)) continue;
    seen.add(id);
    rankingIds.push(id);
  }

  // rebuild tier breaks from tier numbers
  const tiersByPos: TiersByPos = { QB: [], RB: [], WR: [], TE: [] };
  (["QB", "RB", "WR", "TE"] as Position[]).forEach((pos) => {
    const posIds = rankingIds.filter((id) => playersById[id]?.position === pos);
    let lastTier = 1;

    for (const id of posIds) {
      const t = tierByIdFromFile[id] ?? 1;
      if (t > lastTier) {
        tiersByPos[pos].push(id);
        lastTier = t;
      } else {
        lastTier = t;
      }
    }

    tiersByPos[pos] = normalizeTierBreaks(pos, tiersByPos[pos]);
  });

  const players = Object.values(playersById);

  return { rankingIds, tiersByPos, players };
}
