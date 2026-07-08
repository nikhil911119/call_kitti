import { getWinnersMask } from "@/app/game_logic/getWinner";
import { supabase } from "@/lib/supabase";

export async function fetchPlayerHands() {
  const { data, error } = await supabase.from("player_hands").select(`
						id,
						round_id,
						player_id,
						cards,
						sets,
						set_types,
						call,
						actual_wins,
						points_earned,
						created_at
				`);

  if (error) throw error;
  return data;
}

export default fetchPlayerHands;

/**
 * For a given round, compare each set index across all players and
 * increment `actual_wins` for the winning player for that set.
 *
 * Expects `sets` stored as JSONB like:
 * [ ["JD","2C","AH"], ["KC","8D","6D"], ["7C","KS","3H"], ["7S","2S","9H"], ["KD"] ]
 */
export async function computeAndAssignSetWins(roundId: string) {
  if (!roundId) throw new Error("roundId is required");

  const { data: hands, error } = await supabase
    .from("player_hands")
    .select("id, player_id, sets, actual_wins")
    .eq("round_id", roundId);

  if (error) throw error;
  if (!hands || hands.length === 0) return [];

  // Normalize sets array for each player
  const playerSets = hands.map((h: any) =>
    Array.isArray(h.sets) ? h.sets : [],
  );

  // Determine number of valid sets (length >= 3) to compare per player
  const maxSets = Math.max(
    ...playerSets.map(
      (sets: any[]) =>
        sets.filter((s) => Array.isArray(s) && s.length >= 3).length,
    ),
  );

  const winsDelta = new Array(hands.length).fill(0);

  for (let setIndex = 0; setIndex < maxSets; setIndex++) {
    const handsForSet = playerSets.map((sets: any[]) => {
      const s = sets[setIndex];
      return Array.isArray(s) ? s : [];
    });

    const winnersMask = getWinnersMask(handsForSet as any);

    // Add wins for any player marked as winner (mask value 1). Ties produce all-zero mask.
    winnersMask.forEach((v, i) => {
      if (v === 1) winsDelta[i] += 1;
    });
  }

  const results: Array<{
    id: string;
    player_id: string;
    winsGained: number;
    new_actual_wins: number;
  }> = [];

  for (let i = 0; i < hands.length; i++) {
    const row: any = hands[i];
    const gained = winsDelta[i] || 0;
    const newWins = (row.actual_wins || 0) + gained;

    if (gained > 0) {
      const { error: updErr } = await supabase
        .from("player_hands")
        .update({ actual_wins: newWins })
        .eq("id", row.id);
      if (updErr) throw updErr;
    }

    results.push({
      id: row.id,
      player_id: row.player_id,
      winsGained: gained,
      new_actual_wins: newWins,
    });
  }

  return results;
}
