import { evaluateHand } from "./evaluateHand";
import { Card } from "./constants";

export const rankPlayerHands = (hands: Card[][]): number[] => {
  const evaluated = hands.map((hand, index) => ({
    index,
    ...evaluateHand(hand)
  }));

  const compare = (a: any, b: any) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority; // higher priority first
    }

    for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
      const diff = (b.tiebreak[i] || 0) - (a.tiebreak[i] || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  };

  // ✅ sort COPY (not original hands)
  const sorted = [...evaluated].sort(compare);

  const ranks = new Array(hands.length);

  // assign ranks
  sorted.forEach((hand, i) => {
    ranks[hand.index] = i + 1;
  });

  return ranks;
};