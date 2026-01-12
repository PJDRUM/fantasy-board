import { useRef } from "react";
import type { Player } from "../models/Player";
import type { TiersByPos } from "../utils/xlsxRankings";
import {
  exportRankingsCsv,
  importRankingsCsv,
} from "../utils/xlsxRankings";

export function useRankingsIO(args: {
  rankingIds: string[];
  playersById: Record<string, Player>;
  tiersByPos: TiersByPos;
  basePlayers: Player[];
  setRankingIds: (ids: string[]) => void;
  setTiersByPos: (tiers: TiersByPos) => void;
  setExtraPlayers: React.Dispatch<React.SetStateAction<Player[]>>;
}) {
  const {
    rankingIds,
    playersById,
    tiersByPos,
    basePlayers,
    setRankingIds,
    setTiersByPos,
    setExtraPlayers,
  } = args;

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  function exportRankingsCsvClick() {
    const csv = exportRankingsCsv({ rankingIds, playersById, tiersByPos });
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "rankings-export.csv";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function importRankingsCsvClick() {
    fileInputRef.current?.click();
  }

  function importRankingsCsvFile(file: File) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = String(reader.result ?? "");
        const parsed = importRankingsCsv({ csvText: text });

        setRankingIds(parsed.rankingIds);
        setTiersByPos(parsed.tiersByPos);

        const baseIdSet = new Set(basePlayers.map((p) => p.id));
        const extras = parsed.players.filter((p) => !baseIdSet.has(p.id));

        setExtraPlayers((prev) => {
          const prevById = new Map(prev.map((p) => [p.id, p]));
          for (const p of extras) {
            if (!prevById.has(p.id)) prevById.set(p.id, p);
          }
          return Array.from(prevById.values());
        });

        alert("Imported rankings + tiers from CSV.");
      } catch (err: any) {
        alert(`Could not import CSV: ${err?.message ?? String(err)}`);
      }
    };
    reader.readAsText(file);
  }

  return {
    fileInputRef,
    exportRankingsCsvClick,
    importRankingsCsvClick,
    importRankingsCsvFile,
  };
}
