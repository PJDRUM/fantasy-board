// src/components/Board.tsx
import React from "react";
import type { Position, Player } from "../models/Player";
import { DndContext, DragEndEvent } from "@dnd-kit/core";
import { SortableContext } from "@dnd-kit/sortable";
import { horizontalListSortingStrategy } from "@dnd-kit/sortable";
import { BoardCell, CellContent } from "./BoardCell";

export type DraftStyle = "Snake Draft" | "Regular Draft" | "Third Round Reversal";
export type BoardTab = "Rankings Board" | "Draft Board";

function isReverseRound(roundIndex: number, style: DraftStyle) {
  if (style === "Regular Draft") return false;
  if (style === "Snake Draft") return roundIndex % 2 === 1;
  return roundIndex === 1 || (roundIndex >= 2 && roundIndex % 2 === 0);
}

export default function Board(props: {
  boardTab: BoardTab;
  setBoardTab: (t: BoardTab) => void;

  rounds: number;
  teams: number;
  draftStyle: DraftStyle;

  rankingIds: string[];
  playersById: Record<string, Player>;

  draftedIds: Set<string>;
  onToggleDrafted: (id: string) => void;
  clearAllDrafted: () => void;

  teamNames: string[];
  setTeamNames: React.Dispatch<React.SetStateAction<string[]>>;

  draftSlots: (string | null)[];

  posColor: (pos: Position) => string;

  sensors: any;
  onBoardDragEnd: (event: DragEndEvent) => void;
  onDraftBoardDragEnd: (event: DragEndEvent) => void;
}) {
  const {
    boardTab,
    setBoardTab,
    rounds,
    teams,
    draftStyle,
    rankingIds,
    playersById,
    draftedIds,
    onToggleDrafted,
    clearAllDrafted,
    teamNames,
    setTeamNames,
    draftSlots,
    posColor,
    sensors,
    onBoardDragEnd,
    onDraftBoardDragEnd,
  } = props;

  return (
    <div style={{ overflow: "auto", border: "1px solid #ccc", padding: 8 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
          gap: 12,
        }}
      >
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Board</h2>
          <div style={{ display: "flex", gap: 8 }}>
            {(["Rankings Board", "Draft Board"] as BoardTab[]).map((t) => (
              <button
                key={t}
                onClick={() => setBoardTab(t)}
                style={{
                  padding: "6px 10px",
                  cursor: "pointer",
                  fontWeight: boardTab === t ? 800 : 600,
                  opacity: boardTab === t ? 1 : 0.75,
                }}
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        <button onClick={clearAllDrafted}>Unmark All</button>
      </div>

      {boardTab === "Rankings Board" ? (
        <DndContext sensors={sensors} onDragEnd={onBoardDragEnd}>
          <SortableContext
            items={rankingIds}
            strategy={horizontalListSortingStrategy}
          >
            {Array.from({ length: rounds }).map((_, roundIndex) => {
              const reverse = isReverseRound(roundIndex, draftStyle);
              const roundNumber = roundIndex + 1;

              return (
                <div key={roundIndex} style={{ marginBottom: 12 }}>
                  <div>Round {roundNumber}</div>

                  <div style={{ display: "flex" }}>
                    {Array.from({ length: teams }).map((_, teamIndex) => {
                      const pickIndex = reverse
                        ? roundIndex * teams + (teams - 1 - teamIndex)
                        : roundIndex * teams + teamIndex;

                      const playerId = rankingIds[pickIndex];
                      if (!playerId) return null;

                      const player = playersById[playerId];
                      if (!player) return null;

                      const pickInRound = reverse ? teams - teamIndex : teamIndex + 1;
                      const baseLabel = `${roundNumber}.${String(pickInRound).padStart(
                        2,
                        "0"
                      )}`;
                      const label = reverse ? `← ${baseLabel}` : `${baseLabel} →`;

                      return (
                        <BoardCell
                          key={playerId}
                          id={playerId}
                          drafted={draftedIds.has(playerId)}
                          onToggleDrafted={onToggleDrafted}
                          bg={posColor(player.position)}
                        >
                          <CellContent
                            label={label}
                            name={player.name}
                            position={player.position}
                            imageUrl={player.imageUrl}
                            showDash
                          />
                        </BoardCell>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </SortableContext>
        </DndContext>
      ) : (
        <DndContext sensors={sensors} onDragEnd={onDraftBoardDragEnd}>
          {/* TEAM NAMES ROW */}
          <div style={{ display: "flex", marginBottom: 8 }}>
            {Array.from({ length: teams }).map((_, teamIndex) => (
              <div
                key={teamIndex}
                style={{
                  width: 140,
                  minWidth: 140,
                  marginRight: 4,
                  border: "1px solid #444",
                  padding: 6,
                  background: "#fafafa",
                  boxSizing: "border-box",
                }}
              >
                <input
                  value={teamNames[teamIndex] ?? ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setTeamNames((prev) => {
                      const next = [...prev];
                      next[teamIndex] = value;
                      return next;
                    });
                  }}
                  style={{
                    width: "100%",
                    border: "none",
                    outline: "none",
                    background: "transparent",
                    fontWeight: 800,
                    textAlign: "center",
                  }}
                />
              </div>
            ))}
          </div>

          <SortableContext
            items={draftSlots.map((_, i) => `draftslot:${i}`)}
            strategy={horizontalListSortingStrategy}
          >
            {Array.from({ length: rounds }).map((_, roundIndex) => {
              const reverse = isReverseRound(roundIndex, draftStyle);
              const roundNumber = roundIndex + 1;

              return (
                <div key={roundIndex} style={{ marginBottom: 12 }}>
                  <div>Round {roundNumber}</div>

                  <div style={{ display: "flex" }}>
                    {Array.from({ length: teams }).map((_, teamIndex) => {
                      const pickIndex = reverse
                        ? roundIndex * teams + (teams - 1 - teamIndex)
                        : roundIndex * teams + teamIndex;

                      const pickInRound = reverse ? teams - teamIndex : teamIndex + 1;
                      const baseLabel = `${roundNumber}.${String(pickInRound).padStart(
                        2,
                        "0"
                      )}`;
                      const label = reverse ? `← ${baseLabel}` : `${baseLabel} →`;

                      const slotId = `draftslot:${pickIndex}`;
                      const playerId = draftSlots[pickIndex];

                      if (!playerId) {
                        return (
                          <BoardCell
                            key={slotId}
                            id={slotId}
                            drafted={false}
                            onToggleDrafted={() => {}}
                            bg={"#fafafa"}
                          >
                            <CellContent
                              label={label}
                              name={"—"}
                              position={" "}
                              imageUrl={undefined}
                              showDash={false}
                            />
                          </BoardCell>
                        );
                      }

                      const player = playersById[playerId];
                      if (!player) {
                        return (
                          <BoardCell
                            key={slotId}
                            id={slotId}
                            drafted={false}
                            onToggleDrafted={() => {}}
                            bg={"#fafafa"}
                          >
                            <CellContent
                              label={label}
                              name={"—"}
                              position={" "}
                              imageUrl={undefined}
                              showDash={false}
                            />
                          </BoardCell>
                        );
                      }

                      return (
                        <BoardCell
                          key={slotId}
                          id={slotId}
                          drafted={false}
                          onToggleDrafted={() => {}}
                          bg={posColor(player.position)}
                        >
                          <CellContent
                            label={label}
                            name={player.name}
                            position={player.position}
                            imageUrl={player.imageUrl}
                            showDash
                          />
                        </BoardCell>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
