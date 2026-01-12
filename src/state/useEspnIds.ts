import { useEffect, useState } from "react";
import { normalizeName, parseSimpleCsv } from "../utils/espn";

export function useEspnIds() {
  const [espnIdByNormName, setEspnIdByNormName] = useState<Record<string, string>>(
    {}
  );

  useEffect(() => {
    let cancelled = false;

    async function loadEspnIds() {
      try {
        const url =
          "https://raw.githubusercontent.com/mayscopeland/ffb_ids/main/player_ids.csv";

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const text = await res.text();
        const rows = parseSimpleCsv(text);
        if (!rows.length) return;

        const header = rows[0].map((h) =>
          String(h ?? "").trim().toLowerCase()
        );

        const idxName = header.findIndex((h) =>
          ["espn_name", "name", "full_name", "player_name"].includes(h)
        );
        const idxEspn = header.findIndex((h) =>
          ["espn_id", "espn", "espnid"].includes(h)
        );

        if (idxName < 0 || idxEspn < 0) return;

        const map: Record<string, string> = {};

        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] ?? [];
          const name = normalizeName(String(r[idxName] ?? ""));
          const espnId = String(r[idxEspn] ?? "").trim();
          if (!name || !espnId) continue;
          if (!map[name]) map[name] = espnId;
        }

        if (!cancelled) setEspnIdByNormName(map);
      } catch {
        // ignore
      }
    }

    loadEspnIds();
    return () => {
      cancelled = true;
    };
  }, []);

  return { espnIdByNormName };
}
