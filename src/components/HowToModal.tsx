// ---------- Quick How-To modal ----------
import React from "react";

export default function HowToModal({ onClose }: { onClose: () => void }) {

  return (
    <div
      role="dialog"
      aria-modal="true"
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.55)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        zIndex: 9999,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(560px, 92vw)",
          background: "#fff",
          borderRadius: 12,
          border: "1px solid rgba(0,0,0,0.2)",
          boxShadow: "0 10px 30px rgba(0,0,0,0.35)",
          padding: 16,
          textAlign: "left",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            gap: 12,
            alignItems: "center",
            marginBottom: 10,
          }}
        >
          <div style={{ fontSize: 18, fontWeight: 900 }}>Quick How-To</div>
          <button
            onClick={onClose}
            style={{
              border: "1px solid #444",
              background: "#fafafa",
              borderRadius: 8,
              padding: "6px 10px",
              cursor: "pointer",
              fontWeight: 800,
            }}
          >
            Close
          </button>
        </div>

        <div style={{ fontSize: 14, lineHeight: 1.45 }}>
          <div style={{ marginBottom: 8 }}>
            Drag &amp; drop players on the Rankings list or Board to adjust order
          </div>
          <div style={{ marginBottom: 8 }}>Click a player to mark them Drafted</div>
          <div style={{ marginBottom: 8 }}>
            Use the Draft Board tab to view drafted players
          </div>
          <div style={{ marginBottom: 8 }}>
            Export to save rankings, Import to pick up where you left off
          </div>
          <div style={{ marginTop: 12, paddingTop: 10, borderTop: "1px solid #ddd" }}>
            <span style={{ fontWeight: 900 }}>Tip:</span> zoom out on first load to see
            the full board
          </div>
        </div>
      </div>
    </div>
  );
}