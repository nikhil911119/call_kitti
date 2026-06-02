// hooks/useGameRound.ts
import { supabase } from "../../lib/supabase";
import { Alert } from "react-native";
import { createDeck, shuffleDeck } from "../utils/shuffle";

export const useGameRound = () => {
  const startNewRound = async (roomId: string, roundNumber: number = 1) => {
    try {
      // ==================== 1. Get Actual Players from Database ====================
      const { data: players, error: playerError } = await supabase
        .from("room_players")
        .select("user_id, seat_number")
        .eq("room_id", roomId)
        .order("seat_number", { ascending: true });

      if (playerError) throw playerError;
      if (!players || players.length < 2) {
        Alert.alert(
          "Error",
          "Minimum 2 players are required to start the game.",
        );
        return null;
      }

      const numPlayers = players.length;

      // ==================== 2. Create New Round ====================
      const { data: round, error: roundError } = await supabase
        .from("game_rounds")
        .insert({
          room_id: roomId,
          round_number: roundNumber,
          status: "dealing",
        })
        .select()
        .single();

      if (roundError) throw roundError;

      // ==================== 3. Shuffle & Deal Cards ====================
      const fullDeck = createDeck();
      const shuffledDeck = shuffleDeck(fullDeck);

      const cardsPerPlayer = 13;
      const playerHands = [];

      for (let i = 0; i < numPlayers; i++) {
        const startIndex = i * cardsPerPlayer;
        const playerCards = shuffledDeck.slice(
          startIndex,
          startIndex + cardsPerPlayer,
        );

        playerHands.push({
          round_id: round.id,
          player_id: players[i].user_id,
          cards: playerCards, // 13 cards
          sets: [], // Will be filled by player later
          set_types: [],
        });
      }

      // ==================== 4. Save Hands to Database ====================
      const { error: handsError } = await supabase
        .from("player_hands")
        .insert(playerHands);

      if (handsError) throw handsError;

      // ==================== 5. Update Round Status ====================
      await supabase
        .from("game_rounds")
        .update({ status: "arranging" })
        .eq("id", round.id);

      Alert.alert(
        "🎴 Game Started!",
        `${numPlayers} players • Round ${roundNumber}\nCards have been dealt.`,
      );

      return round;
    } catch (error: any) {
      console.error("Start Round Error:", error);
      Alert.alert("Failed to Start Game", error.message);
      return null;
    }
  };

  return { startNewRound };
};
