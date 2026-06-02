import { supabase } from "@/lib/supabase";
import { useFocusEffect, useNavigation } from "@react-navigation/native";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams } from "expo-router";
import { StatusBar } from "expo-status-bar";
import React, { useCallback, useEffect, useState } from "react";
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
  profiles?: { username?: string } | { username?: string }[];
  seat_number: number;
}

const GameScreen: React.FC = () => {
  const navigation = useNavigation();
  const { roomId } = useLocalSearchParams();

  const [players, setPlayers] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useFocusEffect(
    useCallback(() => {
      NavigationBar.setVisibilityAsync("hidden");

      return () => {
        NavigationBar.setVisibilityAsync("visible");
      };
    }, []),
  );

  const fetchPlayers = async () => {
    if (!roomId) return;

    setLoading(true);

    const { data, error } = await supabase
      .from("room_players")
      .select(
        `
        seat_number,
        profiles:user_id ( username )
      `,
      )
      .eq("room_id", roomId)
      .order("seat_number", { ascending: true });

    if (error) {
      console.error("Error fetching players:", error);
      setLoading(false);
      return;
    }

    const playerNames =
      (data as RoomPlayer[])?.map((player) => {
        const profile = Array.isArray(player.profiles)
          ? player.profiles[0]
          : player.profiles;
        return profile?.username || `Player ${player.seat_number}`;
      }) || [];

    setPlayers(playerNames);
    setLoading(false);
  };

  useEffect(() => {
    fetchPlayers();
  }, [roomId]);

  useEffect(() => {
    if (!roomId) return;

    const channel = supabase
      .channel(`game-room-${roomId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "room_players",
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchPlayers();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roomId]);
  console.log("Current Players:", players[0]);

  return (
    <View style={styles.container}>
      <StatusBar hidden />

      <BiddingButtonPopUp style={styles.biddingButton} />

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
        {/* Top Player */}
        {players[1] && (
          <View style={[styles.player, styles.top]}>
            <PlayerIcon
              name={loading ? "Loading..." : players[1] || "Player 2"}
            />
          </View>
        )}

        {/* Left Player */}
        {players[2] && (
          <View style={[styles.player, styles.left]}>
            <PlayerIcon
              name={loading ? "Loading..." : players[2] || "Player 3"}
            />
          </View>
        )}

        {/* Right Player */}
        {players[3] && (
          <View style={[styles.player, styles.right]}>
            <PlayerIcon
              name={loading ? "Loading..." : players[3] || "Player 4"}
            />
          </View>
        )}

        {/* Bottom Player (Current User) */}

        {/* Cards */}
        <View style={styles.cardsContainer}>
          <Cards />
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
