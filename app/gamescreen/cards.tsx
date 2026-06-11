import { supabase } from "@/lib/supabase";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getCardPosition, moveItem } from "../../lib/viewCardHelper";
import { CardItem } from "./CardItem";

const CARD_WIDTH = 55;
const CARD_HEIGHT = 80;

interface CardsProps {
  playerId: string;
  roundId: string | null;
  isMe?: boolean;
}

const Cards: React.FC<CardsProps> = ({ playerId, roundId, isMe = false }) => {
  const [cards, setCards] = useState<string[]>([]);

  useEffect(() => {
    const fetchCards = async () => {
      if (!playerId || !roundId) return;

      const { data, error } = await supabase
        .from("player_hands")
        .select("cards")
        .eq("player_id", playerId)
        .eq("round_id", roundId)
        .maybeSingle();

      if (error) {
        console.error(`Error fetching cards for player ${playerId}:`, error);
        return;
      }

      setCards((data as { cards?: string[] } | null)?.cards ?? []);
    };

    fetchCards();

    if (!roundId) return;

    const channel = supabase
      .channel(`cards-${playerId}-${roundId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_hands",
          filter: `round_id=eq.${roundId}`,
        },
        () => fetchCards(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, roundId]);

  // Only defined when isMe — CardItem receives undefined otherwise, disabling drag
  const onSwap = useCallback(
    (from: number, to: number) => {
      setCards((prev) => moveItem(prev, from, to));
    },
    [],
  );

  const containerWidth = useMemo(() => {
    const lastCardPosition = getCardPosition(12);
    return lastCardPosition + CARD_WIDTH + 20;
  }, []);

  return (
    <View style={[styles.container, { width: containerWidth }]}>
      {cards.map((card, index) => (
        <CardItem
          key={card}
          card={card}
          index={index}
          itemCount={cards.length}
          onSwap={isMe ? onSwap : undefined} // ← undefined disables drag in CardItem
        />
      ))}
    </View>
  );
};

export default Cards;

const styles = StyleSheet.create({
  container: {
    height: CARD_HEIGHT,
    position: "relative",
    alignSelf: "center",
    overflow: "visible",
  },
});