import { useMemo, useState } from "react";
import type { Player } from "../models/Player";
import { espnHeadshotUrl, normalizeName } from "../utils/espn";

export function usePlayers(args: {
  basePlayers: Player[];
  espnIdByNormName: Record<string, string>;
}) {
  const { basePlayers, espnIdByNormName } = args;

  const [extraPlayers, setExtraPlayers] = useState<Player[]>([]);

  const allPlayersArr = useMemo(() => {
    return [...basePlayers, ...extraPlayers];
  }, [basePlayers, extraPlayers]);

  const playersById = useMemo(() => {
    const map: Record<string, Player> = {};
    for (const p of allPlayersArr) {
      const norm = normalizeName(p.name);
      const espnId = espnIdByNormName[norm];
      map[p.id] = {
        ...p,
        imageUrl: espnId ? espnHeadshotUrl(espnId) : p.imageUrl,
      };
    }
    return map;
  }, [allPlayersArr, espnIdByNormName]);

  return {
    extraPlayers,
    setExtraPlayers,
    allPlayersArr,
    playersById,
  };
}
