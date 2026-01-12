// src/models/Player.ts
export type Position = "QB" | "RB" | "WR" | "TE";

export type Player = {
  id: string;
  name: string;
  position: Position;
  team?: string;
  imageUrl?: string;
};
