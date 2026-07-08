import { supabase } from "@/lib/supabase";
import React, { useEffect, useState } from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface PlayerLike {
  id: string;
  name: string;
  seat_number: number;
}

interface ScoreboardProps {
  visible: boolean;
  players: PlayerLike[];
  roundCount?: number;
  playerId?: string | null;
  roundId?: string | null;
  onClose: () => void;
}

const Scoreboard: React.FC<ScoreboardProps> = ({
  visible,
  players,
  roundCount = 5,
  playerId,
  roundId,
  onClose,
}) => {
  const rows = Array.from({ length: roundCount }, (_, index) => index + 1);
  const [playerPoints, setPlayerPoints] = useState<
    Record<string, number | null>
  >({});

  useEffect(() => {
    const fetchPoints = async () => {
      if (!roundId) {
        setPlayerPoints({});
        return;
      }

      const { data, error } = await supabase
        .from("player_hands")
        .select("player_id, points_earned")
        .eq("round_id", roundId);

      if (error) {
        console.error("Error fetching points:", error);
        setPlayerPoints({});
        return;
      }

      const points = (data ?? []).reduce<Record<string, number | null>>(
        (acc, entry) => {
          if (entry.player_id) {
            acc[entry.player_id] =
              typeof entry.points_earned === "number"
                ? entry.points_earned
                : null;
          }
          return acc;
        },
        {},
      );

      setPlayerPoints(points);
    };

    if (!roundId) {
      setPlayerPoints({});
      return;
    }

    fetchPoints();

    const channel = supabase.channel(`scoreboard-${roundId}`);

    channel.on("broadcast", { event: "points-updated" }, (payload) => {
      const incoming = payload.payload as {
        roundId?: string | null;
        playerId?: string | null;
        points?: number | null;
      } | null;

      if (
        incoming?.roundId === roundId &&
        incoming?.playerId &&
        typeof incoming?.points === "number"
      ) {
        setPlayerPoints((prev) => ({
          ...prev,
          [incoming.playerId as string]: incoming.points ?? null,
        }));
      }
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [roundId]);

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Scoreboard</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeButton}>
              <Text style={styles.closeText}>✕</Text>
            </TouchableOpacity>
          </View>

          {playerId && roundId ? (
            <Text style={styles.metaText}>
              Player: {playerId.slice(0, 8)} • Round: {roundId.slice(0, 8)}
            </Text>
          ) : null}

          {players.length > 0 ? (
            <View style={styles.table}>
              <View style={styles.headerRow}>
                <View style={[styles.cell, styles.roundCell]}>
                  <Text style={styles.headerText}>Round</Text>
                </View>
                {players.map((player) => (
                  <View key={player.id} style={styles.cell}>
                    <Text style={styles.headerText} numberOfLines={1}>
                      {player.name}
                    </Text>
                  </View>
                ))}
              </View>

              {rows.map((round) => (
                <View key={round} style={styles.row}>
                  <View style={[styles.cell, styles.roundCell]}>
                    <Text style={styles.rowText}>{round}</Text>
                  </View>
                  {players.map((player) => (
                    <View key={`${player.id}-${round}`} style={styles.cell}>
                      <Text style={styles.rowText}>
                        {round === 1 ? (playerPoints[player.id] ?? 0) : 0}
                      </Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          ) : (
            <Text style={styles.emptyText}>No players joined yet.</Text>
          )}
        </View>
      </View>
    </Modal>
  );
};

export default Scoreboard;

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.45)",
    justifyContent: "center",
    alignItems: "center",
    padding: 16,
  },
  card: {
    width: "100%",
    maxWidth: 560,
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 6,
  },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  title: {
    fontSize: 20,
    fontWeight: "700",
    color: "#222",
  },
  metaText: {
    fontSize: 12,
    color: "#666",
    marginBottom: 10,
  },
  closeButton: {
    padding: 4,
  },
  closeText: {
    fontSize: 18,
    color: "#555",
  },
  table: {
    borderWidth: 1,
    borderColor: "#d9d9d9",
    borderRadius: 12,
    overflow: "hidden",
  },
  row: {
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "#e5e5e5",
  },
  cell: {
    flex: 1,
    minWidth: 70,
    paddingVertical: 10,
    paddingHorizontal: 8,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#fff",
  },
  roundCell: {
    minWidth: 70,
    backgroundColor: "#f5f5f5",
  },
  headerText: {
    fontSize: 13,
    fontWeight: "700",
    color: "#333",
    textAlign: "center",
  },
  rowText: {
    fontSize: 13,
    color: "#444",
  },
  emptyText: {
    textAlign: "center",
    color: "#666",
    paddingVertical: 20,
  },
});
