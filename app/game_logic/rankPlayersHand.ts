import { evaluateHand } from "./evaluateHand";
import { Card } from "./constants";

export const rankPlayerHands = (hands: Card[][]): Card[][] => {
  const evaluated = hands.map((hand) => ({
    hand,
    ...evaluateHand(hand),
  }));

  const compare = (a: any, b: any) => {
    if (a.priority !== b.priority) {
      return b.priority - a.priority;
    }

    for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
      const diff = (b.tiebreak[i] || 0) - (a.tiebreak[i] || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  };
  const sortEvaluated = evaluated.sort(compare).map(({ hand }) => hand);

  return sortEvaluated.slice(0, 4);
};
