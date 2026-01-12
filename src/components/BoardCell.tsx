// src/components/BoardCell.tsx
import React from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

export function BoardCell({
  id,
  drafted,
  onToggleDrafted,
  children,
  bg,
}: {
  id: string;
  drafted: boolean;
  onToggleDrafted: (id: string) => void;
  children: React.ReactNode;
  bg: string;
}) {
  const { setNodeRef, attributes, listeners, transform, transition } =
    useSortable({ id });

  return (
    <div
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        e.stopPropagation();
        onToggleDrafted(id);
      }}
      style={{
        transform: CSS.Transform.toString(transform),
        transition,
        width: 140,
        minWidth: 140,
        border: "1px solid #444",
        padding: 6,
        marginRight: 4,
        background: drafted ? "#e5e7eb" : bg,
        cursor: "grab",
        userSelect: "none",
        position: "relative",
        opacity: drafted ? 0.6 : 1,
        boxSizing: "border-box",
      }}
    >
      {drafted && (
        <div
          style={{
            position: "absolute",
            inset: 0,
            background: "rgba(0,0,0,0.15)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontWeight: "bold",
            color: "#111",
            pointerEvents: "none",
          }}
        >
          DRAFTED
        </div>
      )}
      {children}
    </div>
  );
}

export function CellContent({
  label,
  name,
  position,
  imageUrl,
  showDash,
}: {
  label: string;
  name: string;
  position: string;
  imageUrl?: string;
  showDash?: boolean;
}) {
  const firstInitial = name.split(" ")[0]?.[0] ?? "";
  const lastPart = name.split(" ").slice(1).join(" ");
  const shortName = lastPart ? `${firstInitial}. ${lastPart}` : name;

  return (
    <div
      style={{
        position: "relative",
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        gap: 8,
      }}
    >
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontWeight: 800,
            fontSize: 14,
            lineHeight: 1.1,
            marginTop: 7,
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {shortName}
        </div>
        <div style={{ fontSize: 12, opacity: 0.85 }}>{position}</div>
        {showDash ? (
          <div style={{ fontSize: 14, marginTop: 6 }}>-</div>
        ) : (
          <div style={{ fontSize: 14, marginTop: 6 }}>&nbsp;</div>
        )}
      </div>

      <div
        style={{
          position: "absolute",
          top: -2,
          right: -2,
          fontWeight: 800,
          fontSize: 12,
          opacity: 0.9,
        }}
      >
        {label}
      </div>

      {imageUrl ? (
        <img
          src={imageUrl}
          alt={name}
          style={{
            position: "absolute",
            bottom: -5,
            right: -5,
            width: 40,
            height: 40,
            borderRadius: 6,
            objectFit: "cover",
            background: "transparent",
            filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.35))",
          }}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      ) : null}
    </div>
  );
}
