import { Card } from "./constants";
import { evaluateHand } from "./evaluateHand";

export const getWinnersMask = (hands: Card[][]): number[] => {
  const evaluated = hands.map((hand) => evaluateHand(hand));

  const compare = (a: any, b: any) => {
    // 1. TYPE PRIORITY FIRST
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }

    // 2. RUN / PURE RUN (single value)
    if (a.tiebreak.length === 1) {
      return a.tiebreak[0] - b.tiebreak[0];
    }

    // 3. DOUBLE / HIGH CARD (multi-value)
    for (let i = 0; i < Math.max(a.tiebreak.length, b.tiebreak.length); i++) {
      const diff = (a.tiebreak[i] || 0) - (b.tiebreak[i] || 0);
      if (diff !== 0) return diff;
    }

    return 0;
  };

  // 🔥 find best WITHOUT sorting
  let bestIndex = 0;
  console.log(evaluated);
  for (let i = 1; i < evaluated.length; i++) {
    if (compare(evaluated[i], evaluated[bestIndex]) > 0) {
      bestIndex = i;
    }
  }

  // 🔥 check tie
  let isTie = false;

  for (let i = 0; i < evaluated.length; i++) {
    if (i !== bestIndex && compare(evaluated[i], evaluated[bestIndex]) === 0) {
      isTie = true;
      break;
    }
  }

  if (isTie) {
    return new Array(hands.length).fill(0);
  }

  return evaluated.map((_, i) => (i === bestIndex ? 1 : 0));
};
