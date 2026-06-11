import { getRankValue, Card, SetType } from "./constants";
export const classifySet = (cards: Card[]): SetType => {
  if (cards.length !== 3) return "none";

  const ranks = cards.map(getRankValue).sort((a, b) => a - b);
  // Trial
  if (ranks[0] === ranks[1] && ranks[1] === ranks[2]) return "trial";

  const suits = cards.map((c) => c.slice(-1));
  const isSameSuit = suits[0] === suits[1] && suits[1] === suits[2];

  // Sequence
  const isSequence = ranks[1] === ranks[0] + 1 && ranks[2] === ranks[1] + 1;

  const isWheel = ranks[0] === 2 && ranks[1] === 3 && ranks[2] === 14;

  if (isSequence || isWheel) {
    return isSameSuit ? "pure_run" : "run";
  }

  if (isSameSuit) return "color";
  if (ranks[0] === ranks[1] || ranks[1] === ranks[2]) return "double";

  return "high_card";
};
