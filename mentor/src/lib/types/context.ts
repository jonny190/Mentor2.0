export const ContextType = {
  ROLE: 0,
  GOAL: 1,
} as const;

export const SymbolType = {
  UNDEFINED: 0,
  STANDARD: 1,
  LABEL: 2,
  SUPERSCRIPT: 3,
} as const;

export const ContextIcons = [
  "structure", "cogs", "factory", "hearts", "family", "bunny",
  "house", "flower", "roller", "smiley", "yinyang", "crown",
  "cup", "first", "star", "plane", "boat", "car", "runner",
  "batball", "book", "letter", "phone", "ladder",
] as const;

export type ContextIcon = typeof ContextIcons[number];

export type ContextWithChildren = {
  id: number;
  parentId: number | null;
  name: string;
  description: string;
  ctxType: number;
  symbolType: number;
  symbolIcon: string;
  sortOrder: number;
  userId: number;
  children: { id: number; name: string }[];
};
