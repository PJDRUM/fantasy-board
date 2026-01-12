// src/components/Rankings/TierBar.tsx
import React from "react";
import { useDraggable } from "@dnd-kit/core";
import type { Position } from "../../models/Player";

export default function TierBar({
  pos,
  startId,
  topPx,
  isGhost,
}: {
  pos: Position;
  startId: string;
  topPx: number;
  isGhost?: boolean;
}) {
  const dragId = `tierbar:${pos}:${startId}`;
  const { setNodeRef, attributes, listeners, transform, isDragging } =
    useDraggable({
      id: dragId,
      disabled: !!isGhost,
    });

  const y = transform?.y ?? 0;

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        top: topPx,
        transform: `translate3d(0px, ${y}px, 0px)`,
        height: 10,
        zIndex: isGhost ? 1 : 3,
        pointerEvents: isGhost ? "none" : "auto",
        cursor: isGhost ? "default" : "grab",
        opacity: isGhost ? 0.35 : isDragging ? 0.9 : 1,
        userSelect: "none",
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 6,
          right: 6,
          top: 4,
          height: 2,
          background: "#111",
          borderRadius: 2,
        }}
      />
      <div
        style={{
          position: "absolute",
          right: 10,
          top: 0,
          height: 10,
          width: 34,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 10,
          fontWeight: 800,
          background: "#f3f4f6",
          border: "1px solid #111",
          borderRadius: 6,
        }}
      >
        TIER
      </div>
    </div>
  );
}
