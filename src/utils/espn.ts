// src/utils/espn.ts

export function normalizeName(name: string) {
  return String(name || "")
    .toLowerCase()
    .replace(/\./g, "")
    .replace(/'/g, "")
    .replace(/-/g, " ")
    .replace(/[^a-z\s]/g, " ")
    .replace(/\b(jr|sr|ii|iii|iv|v)\b/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function espnHeadshotUrl(espnId: string) {
  return `https://a.espncdn.com/i/headshots/nfl/players/full/${encodeURIComponent(
    espnId
  )}.png`;
}

export function parseSimpleCsv(text: string): string[][] {
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

  while (
    rows.length &&
    rows[rows.length - 1].every((c) => !String(c ?? "").trim())
  )
    rows.pop();

  return rows;
}
