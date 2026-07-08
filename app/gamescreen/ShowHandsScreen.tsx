import { supabase } from "@/lib/supabase";
import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import {
  Animated,
  Easing,
  Image,
  Modal,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { getCardImage } from "../../src/utils/cardImages";
import { getWinnersMask } from "../game_logic/getWinner";

interface PlayerLike {
  id: string;
  name: string;
  seat_number: number;
}

interface SeatMap {
  1: PlayerLike | null;
  2: PlayerLike | null;
  3: PlayerLike | null;
  4: PlayerLike | null;
}

interface ShowHandsScreenProps {
  visible: boolean;
  players: PlayerLike[];
  handsByPlayer: Record<string, string[][]>;
  seatMap: SeatMap;
  roundId?: string | null;
  onClose?: () => void;
}

const ShowHandsScreen: React.FC<ShowHandsScreenProps> = ({
  visible,
  players,
  handsByPlayer,
  seatMap,
  roundId,
  onClose,
}) => {
  const [fadeAnim] = useState(new Animated.Value(0));
  const [currentBatch, setCurrentBatch] = useState(0);
  const hasFinalizedRef = useRef(false);

  const getDisplaySets = (playerId: string) => {
    const playerSets = handsByPlayer[playerId] ?? [];
    return playerSets
      .slice(0, 4)
      .filter((set) => Array.isArray(set) && set.length > 0);
  };

  const revealPlayers = useMemo(
    () =>
      players
        .filter((player) => getDisplaySets(player.id).length > 0)
        .sort((a, b) => a.seat_number - b.seat_number),
    [players, handsByPlayer],
  );

  const totalBatches = useMemo(
    () => Math.max(...revealPlayers.map((p) => getDisplaySets(p.id).length), 0),
    [revealPlayers, handsByPlayer],
  );

  const setsByPosition = useMemo(() => {
    const positions = [0, 1, 2, 3];
    return positions.map((position) =>
      revealPlayers.map((player) => getDisplaySets(player.id)[position] ?? []),
    );
  }, [revealPlayers, handsByPlayer]);

  const firstSets = setsByPosition[0] ?? [];
  const secondSets = setsByPosition[1] ?? [];
  const thirdSets = setsByPosition[2] ?? [];
  const fourthSets = setsByPosition[3] ?? [];

  const firstSetWinnerMask = useMemo(
    () => getWinnersMask(firstSets),
    [firstSets],
  );
  const secondSetWinnerMask = useMemo(
    () => getWinnersMask(secondSets),
    [secondSets],
  );
  const thirdSetWinnerMask = useMemo(
    () => getWinnersMask(thirdSets),
    [thirdSets],
  );
  const fourthSetWinnerMask = useMemo(
    () => getWinnersMask(fourthSets),
    [fourthSets],
  );

  const currentWinnerMask = useMemo(() => {
    switch (currentBatch) {
      case 1:
        return secondSetWinnerMask;
      case 2:
        return thirdSetWinnerMask;
      case 3:
        return fourthSetWinnerMask;
      case 0:
      default:
        return firstSetWinnerMask;
    }
  }, [
    currentBatch,
    firstSetWinnerMask,
    secondSetWinnerMask,
    thirdSetWinnerMask,
    fourthSetWinnerMask,
  ]);

  const calculatePoints = useCallback(
    (call: number | null | undefined, wins: number | null | undefined) => {
      const bid = Number(call ?? 0);
      const actualWins = Number(wins ?? 0);

      if (actualWins < bid) {
        return -bid;
      }

      if (actualWins === bid) {
        return bid;
      }

      const extraWins = actualWins - bid;
      return bid + extraWins * 0.1;
    },
    [],
  );

  const syncRoundResults = useCallback(async () => {
    if (!roundId || revealPlayers.length === 0) return;

    const playerIds = revealPlayers.map((player) => player.id);
    const winsByPlayer = playerIds.reduce<Record<string, number>>(
      (acc, playerId) => {
        acc[playerId] = 0;
        return acc;
      },
      {},
    );

    const totalSets = Math.max(
      ...playerIds.map((playerId) => getDisplaySets(playerId).length),
      0,
    );

    for (let setIndex = 0; setIndex < totalSets; setIndex++) {
      const handsForSet = playerIds.map(
        (playerId) => getDisplaySets(playerId)[setIndex] ?? [],
      );
      const winnerMask = getWinnersMask(handsForSet as any);

      winnerMask.forEach((isWinner, index) => {
        if (isWinner === 1) {
          const playerId = playerIds[index];
          if (playerId) {
            winsByPlayer[playerId] = (winsByPlayer[playerId] ?? 0) + 1;
          }
        }
      });
    }

    try {
      const { data: roundRows, error: fetchError } = await supabase
        .from("player_hands")
        .select("id, player_id, call")
        .eq("round_id", roundId)
        .in("player_id", playerIds);

      if (fetchError) throw fetchError;

      const updates = (roundRows ?? []).map((row: any) => {
        const playerId = row.player_id;
        const actualWins = winsByPlayer[playerId] ?? 0;
        const points = calculatePoints(row.call, actualWins);

        return supabase
          .from("player_hands")
          .update({ actual_wins: actualWins, points_earned: points })
          .eq("id", row.id);
      });

      await Promise.all(updates);
    } catch (err) {
      console.error("Failed to sync round results:", err);
    }
  }, [calculatePoints, getDisplaySets, roundId, revealPlayers]);

  useEffect(() => {
    if (!visible || revealPlayers.length === 0) {
      hasFinalizedRef.current = false;
      fadeAnim.setValue(0);
      setCurrentBatch(0);
      return;
    }

    if (currentBatch >= totalBatches) {
      if (!hasFinalizedRef.current) {
        hasFinalizedRef.current = true;
        syncRoundResults();
      }
      onClose?.();
      return;
    }

    fadeAnim.setValue(0);

    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
      Animated.delay(3500),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 300,
        easing: Easing.ease,
        useNativeDriver: true,
      }),
    ]).start(() => {
      if (visible) {
        setCurrentBatch((prev) => prev + 1);
      }
    });
  }, [
    visible,
    currentBatch,
    totalBatches,
    revealPlayers.length,
    fadeAnim,
    onClose,
    syncRoundResults,
  ]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.animationWrapper,
            {
              opacity: fadeAnim,
            },
          ]}
        >
          <View style={styles.handsContainer}>
            {revealPlayers.map((player, idx) => {
              const playerCards = getDisplaySets(player.id)[currentBatch] ?? [];
              const isWinner = currentWinnerMask[idx] === 1;

              return (
                <View
                  key={player.id}
                  style={[
                    styles.playerHandSection,
                    isWinner && styles.winningPlayerSection,
                  ]}
                >
                  <Text
                    style={[
                      styles.playerLabel,
                      isWinner && styles.winningPlayerLabel,
                    ]}
                  >
                    {player.name}
                  </Text>
                  <View style={styles.cardsGrid}>
                    {playerCards.map((card, cardIdx) => {
                      const cardImage = getCardImage(card);

                      return (
                        <View
                          key={`${currentBatch}-${card}`}
                          style={[
                            styles.cardBox,
                            { marginLeft: cardIdx > 0 ? -24 : 0 },
                            isWinner && styles.winningCardBox,
                          ]}
                        >
                          {cardImage ? (
                            <Image
                              source={cardImage}
                              style={styles.cardImage}
                            />
                          ) : (
                            <View style={styles.placeholderCard}>
                              <Text style={styles.placeholderText}>{card}</Text>
                            </View>
                          )}
                        </View>
                      );
                    })}
                  </View>
                </View>
              );
            })}
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
};

export default ShowHandsScreen;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  animationWrapper: {
    flex: 1,
    width: "100%",
    justifyContent: "center",
    alignItems: "center",
  },
  handsContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "flex-start",
    gap: 16,
    paddingHorizontal: 12,
  },
  playerHandSection: {
    alignItems: "center",
  },
  cardContainer: {
    alignItems: "center",
    padding: 12,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderRadius: 12,
  },
  playerLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#fff",
    marginBottom: 8,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  winningPlayerSection: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(255, 215, 0, 0.16)",
  },
  winningPlayerLabel: {
    color: "#ffd54f",
  },
  cardsGrid: {
    flexDirection: "row",
    justifyContent: "center",
    marginVertical: 8,
  },
  cardBox: {
    width: 52,
    height: 76,
    borderRadius: 6,
    overflow: "hidden",
    backgroundColor: "#f2f2f2",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.15)",
  },
  winningCardBox: {
    borderColor: "#ffd54f",
    borderWidth: 2,
    shadowColor: "#ffd54f",
    shadowOpacity: 0.6,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 0 },
  },
  cardImage: {
    width: "100%",
    height: "100%",
  },
  placeholderCard: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 2,
  },
  placeholderText: {
    fontSize: 9,
    textAlign: "center",
    color: "#555",
  },
  counter: {
    fontSize: 12,
    color: "rgba(255,255,255,0.8)",
    marginTop: 6,
    textShadowColor: "rgba(0,0,0,0.3)",
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
});
