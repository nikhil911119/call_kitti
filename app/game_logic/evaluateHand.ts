import {classifySet} from './classifySet'
import { getDoubleRanksItemized,getRankValue,Card,getSetPriority,getRunStrength } from "./constants";

// 🔥 Shared evaluator (optimization)
export const evaluateHand = (set: Card[]) => {
  const type = classifySet(set);
  const priority = getSetPriority(type);

  if (type === "pure_run" || type === "run") {
    return {
      type,
      priority,
      tiebreak: [getRunStrength(set)]
    };
  }

  let ranks = set.map(getRankValue).sort((a, b) => b - a);

  if (type === "double") {
    ranks = getDoubleRanksItemized(
      set.map(getRankValue).sort((a, b) => a - b)
    );
  }

  return {
    type,
    priority,
    tiebreak: ranks
  };
};