import { supabase } from "@/lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  Dimensions,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import BiddingButtonPopUp from "../../src/components/BiddingButtonPopUp";
import { colors } from "../../src/theme/tokens";
import { getWinnersMask } from "../game_logic/getWinner";
import Cards from "./cards";
import PlayerIcon from "./playericons";
import Scoreboard from "./Scoreboard";
import ShowHandsScreen from "./ShowHandsScreen";

const { width, height } = Dimensions.get("window");

interface RoomPlayer {
  user_id: string;
  seat_number: number;
  profiles?: { username?: string } | { username?: string }[];
}

interface Player {
  id: string;
  name: string;
  seat_number: number;
}

const GameScreen: React.FC = () => {
  const navigation = useNavigation();
  const { roomId } = useLocalSearchParams();

  const [players, setPlayers] = useState<Player[]>([]);
  const [mySeat, setMySeat] = useState<number | null>(null);
  const [myId, setMyId] = useState<string | null>(null);
  const [currentRoundId, setCurrentRoundId] = useState<string | null>(null);
  const [arrangedCards, setArrangedCards] = useState<string[]>([]);
  const [isBidPlaced, setIsBidPlaced] = useState(false);
  const [showScoreboard, setShowScoreboard] = useState(false);
  const [showHands, setShowHands] = useState(false);
  const [handsByPlayer, setHandsByPlayer] = useState<
    Record<string, string[][]>
  >({});
  const [previousBidCount, setPreviousBidCount] = useState(0);

  const broadcastPointsUpdate = useCallback(
    async (
      nextRoundId: string | null,
      nextPlayerId: string | null,
      points: number | null,
    ) => {
      if (!nextRoundId || !nextPlayerId) return;

      const channel = supabase.channel(`scoreboard-${nextRoundId}`);
      await channel.subscribe();
      await channel.send({
        type: "broadcast",
        event: "points-updated",
        payload: {
          roundId: nextRoundId,
          playerId: nextPlayerId,
          points,
        },
      });
      supabase.removeChannel(channel);
    },
    [],
  );

  useFocusEffect(
    useCallback(() => {
      NavigationBar.setVisibilityAsync("hidden");
      return () => {
        NavigationBar.setVisibilityAsync("visible");
      };
    }, []),
  );

  // Fetch the latest active round for this room
  const fetchCurrentRound = useCallback(async () => {
    if (!roomId) return;

    const { data, error } = await supabase
      .from("game_rounds")
      .select("id")
      .eq("room_id", roomId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      console.error("Error fetching round:", error);
      return;
    }

    if (data?.id) {
      setCurrentRoundId(data.id);
    }
  }, [roomId]);

  const fetchPlayers = useCallback(async () => {
    if (!roomId) return;

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      const { data, error } = await supabase
        .from("room_players")
        .select(
          `
          user_id,
          seat_number,
          profiles:user_id ( username )
        `,
        )
        .eq("room_id", roomId)
        .order("seat_number", { ascending: true });

      if (error) {
        console.error("Error fetching players:", error);
        return;
      }

      const formatted: Player[] =
        (data as RoomPlayer[])?.map((player) => {
          const profile = Array.isArray(player.profiles)
            ? player.profiles[0]
            : player.profiles;

          return {
            id: player.user_id,
            seat_number: player.seat_number,
            name: profile?.username || `Player ${player.seat_number}`,
          };
        }) || [];

      setPlayers(formatted);

      const me = formatted.find((p) => p.id === user?.id);
      if (me) {
        setMySeat(me.seat_number);
        setMyId(me.id);
      }
    } catch (err) {
      console.error("Fetch players failed:", err);
    }
  }, [roomId]);

  useEffect(() => {
    fetchPlayers();
    fetchCurrentRound();
  }, [fetchPlayers, fetchCurrentRound]);

  const groupCardsIntoSets = (cards: string[] | string[][]): string[][] => {
    if (!cards) return [];
    if (Array.isArray(cards[0])) {
      return cards as string[][];
    }

    const flatCards = cards as string[];
    const sets: string[][] = [];

    for (let i = 0; i < flatCards.length; i += 3) {
      if (i + 3 <= flatCards.length && i < 12) {
        sets.push(flatCards.slice(i, i + 3));
      } else {
        sets.push(flatCards.slice(i));
      }
    }

    return sets;
  };

  useEffect(() => {
    setIsBidPlaced(false);
    setShowHands(false);
    setHandsByPlayer({});
    setPreviousBidCount(0);
  }, [currentRoundId]);

  // Listen for room_players changes
  useEffect(() => {
    if (!roomId) return;

    const playersChannel = supabase
      .channel(`game-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${roomId}`,
        },
        () => fetchPlayers(),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(playersChannel);
    };
  }, [roomId, fetchPlayers]);

  // Listen for new rounds starting
  useEffect(() => {
    if (!roomId) return;

    const roundsChannel = supabase
      .channel(`game-rounds-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "game_rounds",
          filter: `room_id=eq.${roomId}`,
        },
        (payload) => {
          // New round started — update the round id so all Cards re-fetch
          setCurrentRoundId(payload.new.id);
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(roundsChannel);
    };
  }, [roomId]);

  const fetchHands = useCallback(async () => {
    if (!roomId || !currentRoundId || players.length === 0) return;

    const { data, error } = await supabase
      .from("player_hands")
      .select("player_id, cards, sets, call")
      .eq("round_id", currentRoundId);

    if (error) {
      console.error("Failed to fetch hand reveal data:", error);
      return;
    }

    const entries = (data ?? []) as {
      player_id?: string;
      cards?: string[] | string[][];
      sets?: string[] | string[][];
      call?: number | null;
    }[];

    const bidsWithCall = entries.filter(
      (entry) => entry.call !== undefined && entry.call !== null,
    );
    const currentBidCount = bidsWithCall.length;

    const hasBidForEachPlayer = players.every((player) => {
      const match = entries.find((entry) => entry.player_id === player.id);
      return Boolean(match?.call !== undefined && match?.call !== null);
    });

    if (
      hasBidForEachPlayer &&
      currentBidCount > previousBidCount &&
      currentBidCount === players.length
    ) {
      const mapped = entries.reduce<Record<string, string[][]>>(
        (acc, entry) => {
          if (entry.player_id) {
            acc[entry.player_id] = groupCardsIntoSets(
              entry.sets ?? entry.cards ?? [],
            );
          }
          return acc;
        },
        {},
      );

      const playerOrder = players.map((player) => player.id);
      const maxSets = Math.max(
        0,
        ...Object.values(mapped).map((sets) => sets.length),
      );

      for (let setIndex = 0; setIndex < maxSets; setIndex++) {
        const handsForSet = playerOrder.map(
          (playerId) => mapped[playerId]?.[setIndex] ?? [],
        );
        const winnerMask = getWinnersMask(handsForSet as any);
        const winnerNames = winnerMask
          .map((value, index) => (value === 1 ? players[index].name : null))
          .filter(Boolean);

        console.log(
          `Round ${currentRoundId} set ${setIndex + 1} winner(s):`,
          winnerNames.length > 0 ? winnerNames : ["tie or no winner"],
          handsForSet,
        );
      }

      setHandsByPlayer(mapped);
      setShowHands(true);
      setPreviousBidCount(currentBidCount);
    } else {
      setPreviousBidCount(currentBidCount);
    }
  }, [roomId, currentRoundId, players, previousBidCount]);

  useEffect(() => {
    fetchHands();
  }, [fetchHands]);

  useEffect(() => {
    if (!roomId || !currentRoundId) return;

    const handsChannel = supabase
      .channel(`hands-${roomId}-${currentRoundId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "player_hands",
          filter: `round_id=eq.${currentRoundId}`,
        },
        () => {
          fetchHands();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(handsChannel);
    };
  }, [roomId, currentRoundId, fetchHands]);

  /**
   * Relative Seat Map
   *
   * Relative 1 = Top
   * Relative 2 = Left
   * Relative 3 = Right
   * Relative 4 = Bottom (YOU) — not rendered as icon
   */
  const seatMap = useMemo(() => {
    const map: Record<number, Player | null> = {
      1: null,
      2: null,
      3: null,
      4: null,
    };

    if (!mySeat) return map;

    players.forEach((player) => {
      const relativeSeat = ((player.seat_number - mySeat + 3) % 4) + 1;
      map[relativeSeat] = player;
    });

    return map;
  }, [players, mySeat]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <BiddingButtonPopUp
        style={styles.biddingButton}
        arrangedCards={arrangedCards}
        roundId={currentRoundId}
        playerId={myId}
        onBidPlaced={(bidAmount) => {
          setIsBidPlaced(true);
          broadcastPointsUpdate(currentRoundId, myId, bidAmount);
        }}
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.iconText}>←</Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.settingsButton}
        onPress={() => setShowScoreboard(true)}
      >
        <Text style={styles.iconText}>⚙️</Text>
      </TouchableOpacity>

      <Scoreboard
        visible={showScoreboard}
        players={players}
        roundCount={5}
        playerId={myId}
        roundId={currentRoundId}
        onClose={() => setShowScoreboard(false)}
      />

      <ShowHandsScreen
        visible={showHands}
        players={players}
        handsByPlayer={handsByPlayer}
        seatMap={seatMap as any}
        roundId={currentRoundId}
        onClose={() => setShowHands(false)}
      />

      <View style={styles.table}>
        {/* TOP */}
        {seatMap[1] && (
          <View style={[styles.player, styles.top]}>
            <PlayerIcon name={seatMap[1].name} />
          </View>
        )}

        {/* LEFT */}
        {seatMap[2] && (
          <View style={[styles.player, styles.left]}>
            <PlayerIcon name={seatMap[2].name} />
          </View>
        )}

        {/* RIGHT */}
        {seatMap[3] && (
          <View style={[styles.player, styles.right]}>
            <PlayerIcon name={seatMap[3].name} />
          </View>
        )}

        {/* YOUR CARDS ONLY */}
        <View style={styles.cardsContainer}>
          {myId && (
            <Cards
              playerId={myId}
              roundId={currentRoundId}
              isMe={true}
              isBidLocked={isBidPlaced}
              onArrangementChange={setArrangedCards}
            />
          )}
        </View>
      </View>
    </View>
  );
};

export default GameScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#52eb34",
    justifyContent: "center",
    alignItems: "center",
  },

  table: {
    width: width,
    height: height * 0.8,
    backgroundColor: colors.accentDark,
    borderRadius: 200,
    borderWidth: 20,
    borderColor: "#7a4a00",
    position: "relative",
  },

  player: {
    position: "absolute",
    alignItems: "center",
  },

  top: {
    top: -40,
    alignSelf: "center",
  },

  bottom: {
    bottom: -60,
    alignSelf: "center",
  },

  left: {
    left: -50,
    top: "50%",
    transform: [{ translateY: -30 }],
  },

  right: {
    right: -50,
    top: "50%",
    transform: [{ translateY: -30 }],
  },

  cardsContainer: {
    position: "absolute",
    bottom: -40,
    alignSelf: "center",
  },

  otherCardsContainer: {
    marginTop: 6,
    opacity: 0.85,
  },

  backButton: {
    position: "absolute",
    top: 40,
    left: 20,
    zIndex: 10,
    backgroundColor: "#00000088",
    padding: 10,
    borderRadius: 8,
  },

  settingsButton: {
    position: "absolute",
    top: 40,
    right: 20,
    zIndex: 10,
    backgroundColor: "#00000088",
    padding: 10,
    borderRadius: 8,
  },

  iconText: {
    color: "#fff",
    fontSize: 18,
    alignSelf: "center",
  },

  biddingButton: {
    position: "absolute",
    bottom: 10,
    right: 20,
    zIndex: 999,
  },
});
