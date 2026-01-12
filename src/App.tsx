// src/App.tsx
import { useEffect, useMemo, useRef, useState } from "react";
import {
  players as basePlayersArr,
  rankingIds as initialRankingIds,
} from "./data/rankings";
import { Position, Player } from "./models/Player";
import RankingsList from "./components/RankingsList";
import { arrayMove } from "./utils/arrayMove";
import {
  exportRankingsCsv,
  importRankingsCsv,
  TiersByPos,
} from "./utils/xlsxRankings";
import {
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import HowToModal from "./components/HowToModal";
import Board, { BoardTab, DraftStyle } from "./components/Board";

import { posColor } from "./utils/posColor";
import { normalizeName, espnHeadshotUrl, parseSimpleCsv } from "./utils/espn";

export default function App() {
  const [teams, setTeams] = useState(12);

  const [teamNames, setTeamNames] = useState<string[]>(
    Array.from({ length: 12 }, (_, i) => `Team ${i + 1}`)
  );

  useEffect(() => {
    setTeamNames((prev) =>
      Array.from({ length: teams }, (_, i) => prev[i] ?? `Team ${i + 1}`)
    );
  }, [teams]);

  const [draftStyle, setDraftStyle] = useState<DraftStyle>("Snake Draft");
  const [rankingIds, setRankingIds] = useState<string[]>(initialRankingIds);

  const [draftedIds, setDraftedIds] = useState<Set<string>>(new Set());
  const [draftedOrder, setDraftedOrder] = useState<string[]>([]);

  const [activeTab, setActiveTab] = useState<"Overall" | Position>("Overall");
  const [boardTab, setBoardTab] = useState<BoardTab>("Rankings Board");

  const [tiersByPos, setTiersByPos] = useState<TiersByPos>({
    QB: [],
    RB: [],
    WR: [],
    TE: [],
  });

  const [extraPlayers, setExtraPlayers] = useState<Player[]>([]);

  const [espnIdByNormName, setEpnIdByNormName] = useState<
    Record<string, string>
  >({});

  const [newPlayerName, setNewPlayerName] = useState("");
  const [newPlayerPos, setNewPlayerPos] = useState<Position>("WR");

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ---------- How-To popup on first load ----------
  const [showHowTo, setShowHowTo] = useState(false);

  useEffect(() => {
    const key = "fantasy-board:howto:v1";
    const already =
      typeof window !== "undefined" ? localStorage.getItem(key) : "1";
    if (!already) setShowHowTo(true);

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setShowHowTo(false);
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  function closeHowTo() {
    try {
      localStorage.setItem("fantasy-board:howto:v1", "1");
    } catch {
      // ignore
    }
    setShowHowTo(false);
  }

  const allPlayersArr = useMemo(() => {
    return [...basePlayersArr, ...extraPlayers];
  }, [extraPlayers]);

  useEffect(() => {
    let cancelled = false;

    async function loadEpnIds() {
      try {
        const url =
          "https://raw.githubusercontent.com/mayscopeland/ffb_ids/main/player_ids.csv";

        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const text = await res.text();

        const rows = parseSimpleCsv(text);
        if (!rows.length) return;

        const header = rows[0].map((h) => String(h ?? "").trim().toLowerCase());

        const idxName = header.findIndex((h) =>
          ["espn_name", "name", "full_name", "player_name"].includes(h)
        );
        const idxEpn = header.findIndex((h) =>
          ["espn_id", "espn", "espnid"].includes(h)
        );

        if (idxEpn < 0 || idxName < 0) return;

        const byName: Record<string, string> = {};
        for (let i = 1; i < rows.length; i++) {
          const r = rows[i] ?? [];
          const name = normalizeName(String(r[idxName] ?? ""));
          const espnId = String(r[idxEpn] ?? "").trim();
          if (!name || !espnId) continue;
          if (!byName[name]) byName[name] = espnId;
        }

        if (!cancelled) setEpnIdByNormName(byName);
      } catch {
        // ignore
      }
    }

    loadEpnIds();
    return () => {
      cancelled = true;
    };
  }, []);

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

  const rounds = Math.ceil(rankingIds.length / teams);

  const totalDraftSlots = rounds * teams;
  const [draftSlots, setDraftSlots] = useState<(string | null)[]>(() =>
    Array.from({ length: totalDraftSlots }, () => null)
  );

  useEffect(() => {
    setDraftSlots((prev) => {
      const next = Array.from(
        { length: totalDraftSlots },
        (_, i) => prev[i] ?? null
      );

      const seen = new Set<string>();
      for (let i = 0; i < next.length; i++) {
        const v = next[i];
        if (!v) continue;
        if (seen.has(v)) next[i] = null;
        else seen.add(v);
      }

      return next;
    });
  }, [totalDraftSlots]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function moveRank(from: number, to: number) {
    setRankingIds((prev) => arrayMove(prev, from, to));
  }

  function resetRankings() {
    setRankingIds([...initialRankingIds]);
  }

  function onBoardDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const from = rankingIds.indexOf(String(active.id));
    const to = rankingIds.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    moveRank(from, to);
  }

  function onDraftBoardDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const a = String(active.id);
    const b = String(over.id);

    if (!a.startsWith("draftslot:") || !b.startsWith("draftslot:")) return;

    const from = Number(a.split(":")[1]);
    const to = Number(b.split(":")[1]);
    if (!Number.isFinite(from) || !Number.isFinite(to)) return;

    setDraftSlots((prev) => {
      const next = [...prev];
      const tmp = next[from] ?? null;
      next[from] = next[to] ?? null;
      next[to] = tmp;
      return next;
    });
  }

  function toggleDrafted(id: string) {
    setDraftedIds((prev) => {
      const next = new Set(prev);
      const wasDrafted = next.has(id);

      if (wasDrafted) next.delete(id);
      else next.add(id);

      setDraftedOrder((prevOrder) => {
        if (wasDrafted) return prevOrder.filter((x) => x !== id);
        if (prevOrder.includes(id)) return prevOrder;
        return [...prevOrder, id];
      });

      setDraftSlots((prevSlots) => {
        const slots = [...prevSlots];

        if (wasDrafted) {
          for (let i = 0; i < slots.length; i++) {
            if (slots[i] === id) slots[i] = null;
          }
          return slots;
        }

        if (slots.includes(id)) return slots;

        const firstEmpty = slots.findIndex((v) => v == null);
        if (firstEmpty >= 0) slots[firstEmpty] = id;

        return slots;
      });

      return next;
    });
  }

  function clearAllDrafted() {
    setDraftedIds(new Set());
    setDraftedOrder([]);
    setDraftSlots(Array.from({ length: totalDraftSlots }, () => null));
  }

  function normalizeTierBreaks(pos: Position, breaks: string[]) {
    const posIds = rankingIds.filter((id) => playersById[id]?.position === pos);
    const posSet = new Set(posIds);

    const unique: string[] = [];
    const seen = new Set<string>();
    for (const id of breaks) {
      if (!posSet.has(id)) continue;
      if (posIds.indexOf(id) <= 0) continue;
      if (seen.has(id)) continue;
      seen.add(id);
      unique.push(id);
    }

    unique.sort((a, b) => posIds.indexOf(a) - posIds.indexOf(b));
    return unique;
  }

  function addTier(pos: Position) {
    const posIds = rankingIds.filter((id) => playersById[id]?.position === pos);
    if (posIds.length === 0) return;

    setTiersByPos((prev) => {
      const current = normalizeTierBreaks(pos, prev[pos] ?? []);

      let nextStart: string;
      if (current.length === 0) {
        nextStart = posIds[Math.min(1, posIds.length - 1)];
      } else {
        const lastStartId = current[current.length - 1];
        const lastIdx = posIds.indexOf(lastStartId);
        const nextIdx = Math.min(lastIdx + 1, posIds.length - 1);
        nextStart = posIds[nextIdx];
      }

      const nextBreaks = normalizeTierBreaks(pos, [...current, nextStart]);
      return { ...prev, [pos]: nextBreaks };
    });
  }

  function removeLastTier(pos: Position) {
    setTiersByPos((prev) => {
      const current = normalizeTierBreaks(pos, prev[pos] ?? []);
      if (current.length === 0) return prev;
      const nextBreaks = current.slice(0, -1);
      return { ...prev, [pos]: nextBreaks };
    });
  }

  function moveTierBreak(pos: Position, fromStartId: string, toStartId: string) {
    setTiersByPos((prev) => {
      const current = normalizeTierBreaks(pos, prev[pos] ?? []);
      const next = current.filter((id) => id !== fromStartId);
      next.push(toStartId);
      return { ...prev, [pos]: normalizeTierBreaks(pos, next) };
    });
  }

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

        const baseIdSet = new Set(basePlayersArr.map((p) => p.id));
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

  function uniqueIdFromName(name: string, taken: Set<string>) {
    const base = slugifyId(name) || "player";
    if (!taken.has(base)) return base;

    let n = 2;
    while (taken.has(`${base}-${n}`)) n++;
    return `${base}-${n}`;
  }

  function addPlayerClick() {
    const name = newPlayerName.trim();
    if (!name) return;

    const taken = new Set<string>([
      ...basePlayersArr.map((p) => p.id),
      ...extraPlayers.map((p) => p.id),
    ]);

    const id = uniqueIdFromName(name, taken);

    const p: Player = {
      id,
      name,
      position: newPlayerPos,
      imageUrl: "",
    };

    setExtraPlayers((prev) => [...prev, p]);
    setRankingIds((prev) => [...prev, id]);

    setNewPlayerName("");
  }

  return (
    <div style={{ height: "100vh", padding: 16, boxSizing: "border-box" }}>
      {showHowTo && <HowToModal onClose={closeHowTo} />}

      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
          marginBottom: 8,
        }}
      >
        <h1 style={{ margin: 0 }}>Fantasy Rankings Board</h1>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button onClick={exportRankingsCsvClick}>Export Rankings (CSV)</button>
          <button onClick={importRankingsCsvClick}>Import Rankings (CSV)</button>
          <button onClick={() => setShowHowTo(true)}>Quick How-To</button>

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            style={{ display: "none" }}
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) importRankingsCsvFile(file);
              e.currentTarget.value = "";
            }}
          />
        </div>
      </div>

      <div
        style={{
          marginBottom: 12,
          display: "flex",
          gap: 16,
          alignItems: "center",
          flexWrap: "wrap",
        }}
      >
        <label>
          Teams:&nbsp;
          <select
            value={teams}
            onChange={(e) => setTeams(Number(e.target.value))}
          >
            {[8, 10, 12, 14, 16].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <label>
          Draft Style:&nbsp;
          <select
            value={draftStyle}
            onChange={(e) => setDraftStyle(e.target.value as DraftStyle)}
          >
            <option value="Snake Draft">Snake Draft</option>
            <option value="Regular Draft">Regular Draft</option>
            <option value="Third Round Reversal">Third Round Reversal</option>
          </select>
        </label>

        <span>Rounds: {rounds}</span>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontWeight: 800 }}>Add Player:</span>
          <input
            value={newPlayerName}
            onChange={(e) => setNewPlayerName(e.target.value)}
            placeholder="Name"
            style={{
              width: 220,
              padding: "6px 8px",
              border: "1px solid #444",
              borderRadius: 6,
              outline: "none",
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") addPlayerClick();
            }}
          />
          <select
            value={newPlayerPos}
            onChange={(e) => setNewPlayerPos(e.target.value as Position)}
          >
            {(["QB", "RB", "WR", "TE"] as Position[]).map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          <button onClick={addPlayerClick} disabled={!newPlayerName.trim()}>
            Add
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "360px 1fr",
          gap: 16,
          height: "calc(100% - 120px)",
          minHeight: 0,
        }}
      >
        {/* LEFT: RANKINGS */}
        <div
          style={{
            border: "1px solid #ccc",
            padding: 8,
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            minHeight: 0,
          }}
        >
          <RankingsList
            rankingIds={rankingIds}
            playersById={playersById}
            draftedIds={draftedIds}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            getColor={posColor}
            onMove={moveRank}
            onReset={resetRankings}
            tiersByPos={tiersByPos}
            onAddTier={addTier}
            onRemoveLastTier={removeLastTier}
            onMoveTierBreak={moveTierBreak}
            onToggleDrafted={toggleDrafted}
          />
        </div>

        {/* RIGHT: BOARD (moved into component) */}
        <Board
          boardTab={boardTab}
          setBoardTab={setBoardTab}
          rounds={rounds}
          teams={teams}
          draftStyle={draftStyle}
          rankingIds={rankingIds}
          playersById={playersById}
          draftedIds={draftedIds}
          onToggleDrafted={toggleDrafted}
          clearAllDrafted={clearAllDrafted}
          teamNames={teamNames}
          setTeamNames={setTeamNames}
          draftSlots={draftSlots}
          posColor={posColor}
          sensors={sensors}
          onBoardDragEnd={onBoardDragEnd}
          onDraftBoardDragEnd={onDraftBoardDragEnd}
        />
      </div>
    </div>
  );
}
