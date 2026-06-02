import { supabase } from "@/lib/supabase";
import { useAuth } from "@/src/hooks/useAuth";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { getCardPosition, moveItem } from "../../lib/viewCardHelper";
import { CardItem } from "./CardItem";
const CARD_WIDTH = 55;
const CARD_HEIGHT = 80;
const CARD_OVERLAP = 25;
const CARD_SPACING = CARD_WIDTH - CARD_OVERLAP;
const GROUP_GAP = 30;
const HAND_SIZE = 13;

// Get card position based on group structure (3,3,3,4)

const Cards: React.FC = () => {
  const [cards, setCards] = useState<string[]>([]);
  const { user } = useAuth();

  useEffect(() => {
    const fetchCards = async () => {
      if (!user?.id) {
        // wait until auth is initialized
        return;
      }

      // fetch the most recent hand for this user
      const { data, error } = await supabase
        .from("player_hands")
        .select("cards, round_id")
        .eq("player_id", user.id)
        .order("created_at", { ascending: false })
        .maybeSingle();

      if (error) {
        console.error("Error fetching cards:", error);
        return;
      }

      setCards((data as { cards?: string[] } | null)?.cards ?? []);
    };

    fetchCards();
  }, [user?.id]);

  const onSwap = useCallback((from: number, to: number) => {
    setCards((prev) => moveItem(prev, from, to));
  }, []);

  // Calculate container width
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
          onSwap={onSwap}
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
