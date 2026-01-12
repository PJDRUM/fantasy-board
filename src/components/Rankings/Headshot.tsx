// src/components/Rankings/Headshot.tsx
import React from "react";

export default function Headshot({
  src,
  alt,
}: {
  src?: string;
  alt: string;
}) {
  if (!src) return null;

  return (
    <img
      src={src}
      alt={alt}
      style={{
        width: 32,
        height: 32,
        borderRadius: 6,
        objectFit: "cover",
        border: "1px solid rgba(0,0,0,0.25)",
        background: "rgba(255,255,255,0.6)",
        flexShrink: 0,
      }}
      onError={(e) => {
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}
