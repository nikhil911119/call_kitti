import { supabase } from "@/lib/supabase";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { StyleSheet, View } from "react-native";
import { getCardPosition, moveItem } from "../../lib/viewCardHelper";
import { CardItem } from "./CardItem";

const CARD_WIDTH = 55;
const CARD_HEIGHT = 80;

interface CardsProps {
  playerId: string;
  roundId: string | null;
  isMe?: boolean;
  isBidLocked?: boolean;
  onArrangementChange?: (arrangedCards: string[]) => void;
}

const Cards: React.FC<CardsProps> = ({
  playerId,
  roundId,
  isMe = false,
  isBidLocked = false,
  onArrangementChange,
}) => {
  const [cards, setCards] = useState<string[]>([]);
  const hasLoadedInitialCards = useRef(false);

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

      const fetchedCards = (data as { cards?: string[] } | null)?.cards ?? [];

      if (!isMe && fetchedCards.length > 0) {
        setCards(fetchedCards);
      }

      if (isMe && fetchedCards.length > 0) {
        if (!hasLoadedInitialCards.current) {
          setCards(fetchedCards);
          hasLoadedInitialCards.current = true;
        }
        onArrangementChange?.(cards.length > 0 ? cards : fetchedCards);
      }
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
        () => {
          if (!isMe) {
            fetchCards();
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [playerId, roundId, isMe]);

  // Only defined when isMe — CardItem receives undefined otherwise, disabling drag
  const onSwap = useCallback(
    (from: number, to: number) => {
      setCards((prev) => {
        const updated = moveItem(prev, from, to);
        // Defer callback to next tick to avoid updating parent during child render
        requestAnimationFrame(() => {
          console.log("Card arrangement changed:", updated);
          onArrangementChange?.(updated);
        });
        return updated;
      });
    },
    [onArrangementChange],
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
          onSwap={isMe && !isBidLocked ? onSwap : undefined} // disable drag after a bid is placed
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