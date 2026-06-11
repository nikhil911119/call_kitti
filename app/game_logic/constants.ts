export type Card = string;
export type SetType =
  | "trial"
  | "pure_run"
  | "run"
  | "color"
  | "double"
  | "high_card"
  | "none";

export const getRankValue = (card: Card): number => {
  const rank = card.slice(0, -1);
  if (rank === "A") return 14;
  if (rank === "K") return 13;
  if (rank === "Q") return 12;
  if (rank === "J") return 11;
  if (rank === "10") return 10;
  return parseInt(rank);
};

export const getSetPriority = (type: SetType): number => {
  switch (type) {
    case "trial": return 6;
    case "pure_run": return 5;
    case "run": return 4;
    case "color": return 3;
    case "double": return 2;
    case "high_card": return 1;
    default: return 0;
  }
};

export const getDoubleRanksItemized = (ranksAscending: number[]): number[] => {
  if (ranksAscending[1] === ranksAscending[2]) {
    return [ranksAscending[1], ranksAscending[2], ranksAscending[0]];
  }
  return [ranksAscending[0], ranksAscending[1], ranksAscending[2]];
};

// 🔥 Run strength (your custom order)
export const getRunStrength = (cards: Card[]): number => {
  const ranks = cards.map(getRankValue).sort((a, b) => a - b);

  // A-K-Q → highest
  if (ranks[0] === 12 && ranks[1] === 13 && ranks[2] === 14) {
    return 100;
  }

  // A-2-3 → second highest
  if (ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14) {
    return 99;
  }

  // Normal sequences
  return ranks[2];
};