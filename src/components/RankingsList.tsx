// src/components/RankingsList.tsx
import React from "react";
import type { Player, Position } from "../models/Player";
import type { TiersByPos } from "../utils/xlsxRankings";

import {
  DndContext,
  DragEndEvent,
  DragMoveEvent,
  DragCancelEvent,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";

import SortableRow from "./Rankings/SortableRow";
import TierBar from "./Rankings/TierBar";
import Headshot from "./Rankings/Headshot";
import {
  buildSearchMatches,
  type SearchMatch,
} from "./Rankings/searchUtils";

type Tab = "Overall" | Position;

type Props = {
  rankingIds: string[];
  playersById: Record<string, Player>;
  draftedIds: Set<string>;

  activeTab: Tab;
  setActiveTab: (tab: Tab) => void;

  getColor: (pos: Position) => string;

  onMove: (fromIndex: number, toIndex: number) => void;
  onReset: () => void;

  tiersByPos: TiersByPos;
  onAddTier: (pos: Position) => void;
  onRemoveLastTier: (pos: Position) => void;
  onMoveTierBreak: (pos: Position, fromStartId: string, toStartId: string) => void;

  onToggleDrafted: (id: string) => void;
};

export default function RankingsList({
  rankingIds,
  playersById,
  draftedIds,
  activeTab,
  setActiveTab,
  getColor,
  onMove,
  onReset,
  tiersByPos,
  onAddTier,
  onRemoveLastTier,
  onMoveTierBreak,
  onToggleDrafted,
}: Props) {
  const tabs: Tab[] = ["Overall", "QB", "RB", "WR", "TE"];
  const isOverall = activeTab === "Overall";

  // Shared scroll container + row refs across ALL tabs (needed for jump-to)
  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const rowRefs = React.useRef<Record<string, HTMLDivElement | null>>({});

  // Search (jump-to, not filter)
  const [query, setQuery] = React.useState("");
  const [activeMatchIndex, setActiveMatchIndex] = React.useState(0);
  const [highlightId, setHighlightId] = React.useState<string | null>(null);
  const highlightTimerRef = React.useRef<number | null>(null);

  const idsForTab = React.useMemo(() => {
    if (isOverall) return rankingIds;
    return rankingIds.filter((id) => playersById[id]?.position === activeTab);
  }, [isOverall, rankingIds, playersById, activeTab]);

  const tierBreaks = React.useMemo(() => {
    if (isOverall) return [];
    return tiersByPos[activeTab] ?? [];
  }, [isOverall, tiersByPos, activeTab]);

  const matches: SearchMatch[] = React.useMemo(() => {
    return buildSearchMatches({
      query,
      idsForTab,
      playersById,
      isOverall,
      rankingIds,
      limit: 12,
    });
  }, [query, idsForTab, playersById, isOverall, rankingIds]);

  React.useEffect(() => {
    setActiveMatchIndex(0);
  }, [query, activeTab]);

  function flashHighlight(id: string) {
    if (highlightTimerRef.current) window.clearTimeout(highlightTimerRef.current);
    setHighlightId(id);
    highlightTimerRef.current = window.setTimeout(() => setHighlightId(null), 900);
  }

  function scrollRowToTopVisible(id: string, opts?: { flash?: boolean }) {
    const container = containerRef.current;
    const row = rowRefs.current[id];
    if (!container || !row) return;

    const cRect = container.getBoundingClientRect();
    const rRect = row.getBoundingClientRect();

    // Move the scroll container so the row becomes the TOP VISIBLE row
    container.scrollTop += rRect.top - cRect.top;

    if (opts?.flash) flashHighlight(id);
  }

  function jumpToPlayer(id: string) {
    scrollRowToTopVisible(id, { flash: true });
    setQuery("");
  }

  // When switching tabs: auto-scroll so the FIRST NOT-DRAFTED player is the TOP VISIBLE row
  React.useEffect(() => {
    const target = idsForTab.find((id) => !draftedIds.has(id)) ?? idsForTab[0];
    if (!target) return;

    const raf1 = window.requestAnimationFrame(() => {
      const raf2 = window.requestAnimationFrame(() => {
        scrollRowToTopVisible(target, { flash: false });
      });
      return () => window.cancelAnimationFrame(raf2);
    });

    return () => window.cancelAnimationFrame(raf1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeTab, idsForTab, draftedIds]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  function onOverallDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;

    const from = rankingIds.indexOf(String(active.id));
    const to = rankingIds.indexOf(String(over.id));
    if (from === -1 || to === -1) return;

    onMove(from, to);
  }

  /* ---------- tier bar dragging (position tabs only) ---------- */
  const [hoverStartId, setHoverStartId] = React.useState<string | null>(null);

  // gapTops depends on DOM layout (refs), so compute AFTER render and keep in state.
  const [gapTops, setGapTops] = React.useState<Record<string, number>>({});

  const recomputeGapTops = React.useCallback(() => {
    if (isOverall) {
      setGapTops({});
      return;
    }

    const out: Record<string, number> = {};
    for (let i = 1; i < idsForTab.length; i++) {
      const id = idsForTab[i];
      const el = rowRefs.current[id];
      if (!el) continue;
      out[id] = el.offsetTop - 6; // align with row marginBottom
    }
    setGapTops(out);
  }, [idsForTab, isOverall]);

  React.useLayoutEffect(() => {
    if (isOverall) return;

    const raf1 = window.requestAnimationFrame(() => {
      const raf2 = window.requestAnimationFrame(() => {
        recomputeGapTops();
      });
      return () => window.cancelAnimationFrame(raf2);
    });

    return () => window.cancelAnimationFrame(raf1);
  }, [recomputeGapTops, isOverall, activeTab]);

  React.useEffect(() => {
    if (isOverall) return;

    const onResize = () => recomputeGapTops();
    window.addEventListener("resize", onResize);

    return () => {
      window.removeEventListener("resize", onResize);
    };
  }, [isOverall, recomputeGapTops]);

  function nearestGapStartIdFromClientY(clientY: number): string | null {
    if (isOverall) return null;
    const container = containerRef.current;
    if (!container) return null;

    const rect = container.getBoundingClientRect();
    const yInScroll = clientY - rect.top + container.scrollTop;

    let bestId: string | null = null;
    let bestDist = Number.POSITIVE_INFINITY;

    for (let i = 1; i < idsForTab.length; i++) {
      const startId = idsForTab[i];
      const top = gapTops[startId];
      if (typeof top !== "number") continue;

      const dist = Math.abs(yInScroll - top);
      if (dist < bestDist) {
        bestDist = dist;
        bestId = startId;
      }
    }

    return bestId;
  }

  function parseTierDragId(id: string): { pos: Position; startId: string } | null {
    const s = String(id);
    if (!s.startsWith("tierbar:")) return null;

    const parts = s.split(":");
    if (parts.length < 3) return null;

    const pos = parts[1] as Position;
    const startId = parts.slice(2).join(":");

    if (!["QB", "RB", "WR", "TE"].includes(pos)) return null;
    return { pos, startId };
  }

  function onTierBarDragMove(e: DragMoveEvent) {
    const parsed = parseTierDragId(String(e.active.id));
    if (!parsed) return;
    if (isOverall) return;
    if (parsed.pos !== activeTab) return;

    // keep layout fresh while dragging
    if (Object.keys(gapTops).length === 0) recomputeGapTops();

    const r = e.active.rect.current.translated;
    const centerY = (r?.top ?? 0) + (r?.height ?? 0) / 2;

    const startId = nearestGapStartIdFromClientY(centerY);
    setHoverStartId(startId);
  }

  function onTierBarDragEnd(e: DragEndEvent) {
    const parsed = parseTierDragId(String(e.active.id));
    if (!parsed) return;
    if (isOverall) return;

    const pos = parsed.pos;
    const fromStartId = parsed.startId;

    const r = e.active.rect.current.translated;
    const centerY = (r?.top ?? 0) + (r?.height ?? 0) / 2;

    const toStartId = nearestGapStartIdFromClientY(centerY);

    setHoverStartId(null);

    if (!toStartId) return;
    if (toStartId === fromStartId) return;

    onMoveTierBreak(pos, fromStartId, toStartId);
  }

  function onTierBarDragCancel(_: DragCancelEvent) {
    setHoverStartId(null);
  }

  /* ---------- render ---------- */
  const removeTierDisabled =
    isOverall || (tiersByPos[activeTab]?.length ?? 0) === 0;

  const showDropdown = query.trim().length > 0 && matches.length > 0;

  // Tier label counter (position tabs only)
  let tierNum = 1;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 10,
        }}
      >
        <h2 style={{ margin: 0 }}>Rankings</h2>

        {isOverall ? (
          <button onClick={onReset}>Reset Rankings</button>
        ) : (
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => onAddTier(activeTab)}
              disabled={idsForTab.length === 0}
              style={{ padding: "6px 8px", fontSize: 12, cursor: "pointer" }}
              title={idsForTab.length === 0 ? "No players in this position." : "Add a new tier break."}
            >
              Add Tier
            </button>
            <button
              onClick={() => onRemoveLastTier(activeTab)}
              disabled={removeTierDisabled}
              style={{ padding: "6px 8px", fontSize: 12, cursor: "pointer" }}
              title="Remove the last tier break."
            >
              Remove Tier
            </button>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div style={{ display: "flex", gap: 8, marginBottom: 8, alignItems: "center" }}>
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            style={{
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: activeTab === t ? 800 : 600,
              opacity: activeTab === t ? 1 : 0.75,
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {/* Search (jump-to; does not filter) */}
      <div style={{ position: "relative", marginBottom: 8 }}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={`Search ${activeTab}...`}
          style={{
            width: "100%",
            padding: "8px 10px",
            border: "1px solid #444",
            borderRadius: 6,
            outline: "none",
          }}
          onKeyDown={(e) => {
            if (!showDropdown) {
              if (e.key === "Escape") setQuery("");
              return;
            }

            if (e.key === "ArrowDown") {
              e.preventDefault();
              setActiveMatchIndex((i) => Math.min(i + 1, matches.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setActiveMatchIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              const pick = matches[activeMatchIndex];
              if (pick) jumpToPlayer(pick.id);
            } else if (e.key === "Escape") {
              e.preventDefault();
              setQuery("");
            }
          }}
        />

        {showDropdown && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              marginTop: 4,
              border: "1px solid #444",
              borderRadius: 6,
              background: "#fff",
              zIndex: 50,
              maxHeight: 260,
              overflow: "auto",
              boxShadow: "0 6px 20px rgba(0,0,0,0.12)",
            }}
          >
            {matches.map((m, idx) => {
              const isActive = idx === activeMatchIndex;
              return (
                <div
                  key={m.id}
                  onMouseEnter={() => setActiveMatchIndex(idx)}
                  onMouseDown={(ev) => ev.preventDefault()}
                  onClick={() => jumpToPlayer(m.id)}
                  style={{
                    padding: "8px 10px",
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    background: isActive ? "#f3f4f6" : "#fff",
                    borderBottom: "1px solid #eee",
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontWeight: 800,
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                    >
                      {m.name}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.8 }}>{m.pos}</div>
                  </div>
                  <div style={{ fontSize: 12, fontWeight: 800, opacity: 0.8 }}>
                    #{m.rankLabel}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* List */}
      {isOverall ? (
        <DndContext sensors={sensors} onDragEnd={onOverallDragEnd}>
          <SortableContext items={rankingIds} strategy={verticalListSortingStrategy}>
            <div
              ref={containerRef}
              style={{
                overflow: "auto",
                flex: 1,
                minHeight: 0,
                paddingRight: 6,
              }}
            >
              {rankingIds.map((id, idx) => {
                const p = playersById[id];
                if (!p) return null;

                const drafted = draftedIds.has(id);
                const isHi = highlightId === id;

                return (
                  <SortableRow key={id} id={id}>
                    <div
                      ref={(el) => {
                        rowRefs.current[id] = el;
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleDrafted(id);
                      }}
                      style={{
                        border: isHi ? "2px solid #111" : "1px solid #444",
                        padding: 8,
                        marginBottom: 6,
                        background: drafted ? "#e5e7eb" : getColor(p.position),
                        color: drafted ? "#6b7280" : "#000",
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        userSelect: "none",
                        cursor: "pointer",
                        boxShadow: isHi ? "0 0 0 2px rgba(0,0,0,0.08)" : undefined,
                      }}
                    >
                      <Headshot src={p.imageUrl} alt={p.name} />
                      <div style={{ flex: 1, fontWeight: 800, fontSize: 16 }}>
                        {idx + 1}. {p.name} ({p.position})
                      </div>
                    </div>
                  </SortableRow>
                );
              })}
            </div>
          </SortableContext>
        </DndContext>
      ) : (
        <DndContext
          sensors={sensors}
          onDragMove={onTierBarDragMove}
          onDragEnd={onTierBarDragEnd}
          onDragCancel={onTierBarDragCancel}
        >
          <div
            ref={containerRef}
            style={{
              overflow: "auto",
              flex: 1,
              minHeight: 0,
              paddingRight: 6,
              position: "relative",
            }}
          >
            {/* ghost preview bar */}
            {hoverStartId && typeof gapTops[hoverStartId] === "number" && (
              <TierBar
                pos={activeTab}
                startId={"__ghost__"}
                topPx={gapTops[hoverStartId]}
                isGhost
              />
            )}

            {/* actual tier bars */}
            {tierBreaks
              .filter(
                (startId) =>
                  idsForTab.indexOf(startId) > 0 &&
                  typeof gapTops[startId] === "number"
              )
              .map((startId) => (
                <TierBar
                  key={`bar:${activeTab}:${startId}`}
                  pos={activeTab}
                  startId={startId}
                  topPx={gapTops[startId]}
                />
              ))}

            {idsForTab.map((id, idx) => {
              const p = playersById[id];
              if (!p) return null;

              const drafted = draftedIds.has(id);
              const showTierHeader = tierBreaks.includes(id);
              if (showTierHeader) tierNum += 1;

              const isHi = highlightId === id;

              return (
                <React.Fragment key={id}>
                  {(idx === 0 || showTierHeader) && (
                    <div
                      style={{
                        border: "1px solid #111",
                        padding: "8px 10px",
                        marginBottom: 6,
                        background: "#f3f4f6",
                        fontWeight: 800,
                        letterSpacing: 0.2,
                        userSelect: "none",
                        opacity: 0.95,
                      }}
                    >
                      Tier {tierNum}
                    </div>
                  )}

                  <div
                    ref={(el) => {
                      rowRefs.current[id] = el;
                    }}
                    onClick={() => onToggleDrafted(id)}
                    style={{
                      border: isHi ? "2px solid #111" : "1px solid #444",
                      padding: 8,
                      marginBottom: 6,
                      background: drafted ? "#e5e7eb" : getColor(p.position),
                      color: drafted ? "#6b7280" : "#000",
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      userSelect: "none",
                      cursor: "pointer",
                      boxShadow: isHi ? "0 0 0 2px rgba(0,0,0,0.08)" : undefined,
                    }}
                  >
                    <Headshot src={p.imageUrl} alt={p.name} />
                    <div style={{ flex: 1, fontWeight: 800, fontSize: 16 }}>
                      {p.name} ({p.position})
                    </div>
                  </div>
                </React.Fragment>
              );
            })}
          </div>
        </DndContext>
      )}
    </div>
  );
}
