import { rankPlayerHands } from "@/app/game_logic/rankPlayersHand";
import { supabase } from "@/lib/supabase";
import React, { useState } from "react";
import {
  Alert,
  Modal,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
  ViewStyle,
} from "react-native";

type BiddingButtonPopUpProps = {
  style?: ViewStyle;
  arrangedCards: string[];
  roundId: string | null;
  playerId: string | null;
};

const BiddingButtonPopUp: React.FC<BiddingButtonPopUpProps> = ({
  style,
  arrangedCards,
  roundId,
  playerId,
}) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [currentBid, setCurrentBid] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleBidPress = () => {
    setModalVisible(true);
  };

  const formatCardsAs2D = (cards: string[]): string[][] => {
    const rows: string[][] = [];
    for (let i = 0; i < cards.length; i += 3) {
      rows.push(cards.slice(i, i + 3));
    }
    return rows;
  };

  const handleConfirmBid = async () => {
    const { data, error } = await supabase
      .from("player_hands")
      .select("sets")
      .eq("round_id", roundId)
      .eq("player_id", playerId)
      .maybeSingle();
    if (!playerId || !roundId) {
      Alert.alert(
        "Unable to place bid",
        "Missing player or round context. Please try again.",
      );

      return;
    }

    if (arrangedCards.length === 0) {
      Alert.alert(
        "No cards available",
        "Please arrange your cards before placing a bid.",
      );
      return;
    }

    setIsSubmitting(true);

    const cards2D = formatCardsAs2D(arrangedCards);

    try {
      const payload = {
        round_id: roundId,
        player_id: playerId,
        cards: arrangedCards,
        sets: rankPlayerHands(cards2D || []),
        set_types: [],
        call: currentBid,
      };

      const { error } = await supabase
        .from("player_hands")
        .upsert(payload, { onConflict: "round_id,player_id" });

      if (error) throw error;
      console.log("Ranked hands:");

      Alert.alert("Bid placed", `Your bid of ${currentBid} was saved.`);
      setModalVisible(false);
    } catch (error: any) {
      console.error("Bid submit failed:", error);
      Alert.alert("Failed to save bid", error?.message || "Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDecreaseBid = () => {
    if (currentBid > 0) {
      setCurrentBid(currentBid - 1);
    }
  };

  const handleIncreaseBid = () => {
    if (currentBid < 4) {
      setCurrentBid(currentBid + 1);
    }
  };

  const handleCloseModal = () => {
    setModalVisible(false);
    setCurrentBid(0);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.bidButton, style]}
        onPress={handleBidPress}
      >
        <Text style={styles.bidButtonText}>Place Bid</Text>
      </TouchableOpacity>

      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={handleCloseModal}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          onPress={handleCloseModal}
        >
          <View style={styles.modalContainer}>
            <Text style={styles.modalTitle}>Place Your Bid</Text>

            <View style={styles.bidSelector}>
              <TouchableOpacity
                style={[
                  styles.controlButton,
                  currentBid === 0 && styles.disabledButton,
                ]}
                onPress={handleDecreaseBid}
                disabled={currentBid === 0}
              >
                <Text style={styles.controlButtonText}>-</Text>
              </TouchableOpacity>

              <View style={styles.bidDisplay}>
                <Text style={styles.bidValue}>{currentBid}</Text>
              </View>

              <TouchableOpacity
                style={[
                  styles.controlButton,
                  currentBid === 4 && styles.disabledButton,
                ]}
                onPress={handleIncreaseBid}
                disabled={currentBid === 4}
              >
                <Text style={styles.controlButtonText}>+</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={handleCloseModal}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.modalButton, styles.confirmButton]}
                onPress={handleConfirmBid}
                disabled={isSubmitting}
              >
                <Text style={styles.confirmButtonText}>
                  {isSubmitting ? "Saving..." : "Confirm Bid"}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableOpacity>
      </Modal>
    </>
  );
};

const styles = StyleSheet.create({
  bidButton: {
    backgroundColor: "#4CAF50",
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bidButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "bold",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    maxWidth: 400,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 22,
    fontWeight: "bold",
    marginBottom: 20,
    textAlign: "center",
    color: "#333",
  },
  bidSelector: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 30,
  },
  controlButton: {
    backgroundColor: "#4CAF50",
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  controlButtonText: {
    color: "white",
    fontSize: 24,
    fontWeight: "bold",
  },
  disabledButton: {
    backgroundColor: "#cccccc",
  },
  bidDisplay: {
    marginHorizontal: 20,
    minWidth: 80,
    alignItems: "center",
  },
  bidValue: {
    fontSize: 36,
    fontWeight: "bold",
    color: "#333",
  },
  buttonContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  modalButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  confirmButton: {
    backgroundColor: "#4CAF50",
  },
  cancelButton: {
    backgroundColor: "#f5f5f5",
    borderWidth: 1,
    borderColor: "#ddd",
  },
  confirmButtonText: {
    color: "white",
    fontSize: 16,
    fontWeight: "600",
  },
  cancelButtonText: {
    color: "#666",
    fontSize: 16,
    fontWeight: "600",
  },
});

export default BiddingButtonPopUp;
