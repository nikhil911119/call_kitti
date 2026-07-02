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
import Cards from "./cards";
import PlayerIcon from "./playericons";

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
  const [loading, setLoading] = useState(true);
  const [arrangedCards, setArrangedCards] = useState<string[]>([]);

  useFocusEffect(
    useCallback(() => {
      NavigationBar.setVisibilityAsync("hidden");
      return () => {
        NavigationBar.setVisibilityAsync("visible");
      };
    }, []),
  );

  // Fetch the latest active round for this room
  const fetchCurrentRound = async () => {
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
  };

  const fetchPlayers = async () => {
    if (!roomId) return;

    try {
      setLoading(true);

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
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPlayers();
    fetchCurrentRound();
  }, [roomId]);

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
  }, [roomId]);

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
      />

      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.iconText}>←</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.settingsButton} onPress={() => {}}>
        <Text style={styles.iconText}>⚙️</Text>
      </TouchableOpacity>

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
    bottom: 20,
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
