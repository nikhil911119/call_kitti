// hooks/useJoinRoom.ts
import { useState } from "react";
import { Alert } from "react-native";
import { supabase } from "../../lib/supabase";

export const useJoinRoom = () => {
  const [loading, setLoading] = useState(false);

  const joinRoom = async (roomCode: string, user: any) => {
    if (!user) return null;

    const code = roomCode.trim().toUpperCase();
    console.log("🔍 Searching for room code:", code);

    setLoading(true);

    try {
      // 1. First, search WITHOUT status filter to debug
      const { data: allRooms, error: allError } = await supabase
        .from("game_rooms")
        .select("id, room_code, status, current_players")
        .eq("room_code", code);

      console.log("📋 All rooms with this code:", allRooms);
      if (allError) console.error("All rooms query error:", allError);

      // 2. Now search with waiting status
      const { data: rooms, error } = await supabase
        .from("game_rooms")
        .select("*")
        .eq("room_code", code);

      if (error) throw error;

      if (!rooms || rooms.length === 0) {
        Alert.alert(
          "Room Not Found",
          `No waiting room found with code: ${code}\n\nCheck if status is 'waiting' in Supabase.`,
        );
        return null;
      }

      const room = rooms[0];
      console.log("Room found:", room);

      // ... rest of the join logic
      if (room.current_players >= 4) {
        throw new Error("Room is full");
      }

      // Check if already joined
      const { data: existing } = await supabase
        .from("room_players")
        .select("seat_number")
        .eq("room_id", room.id)
        .eq("user_id", user.id)
        .single();

      if (existing) {
        Alert.alert("Already Joined", `You are Player ${existing.seat_number}`);
        return room;
      }

      // Assign seat
      const { data: occupied } = await supabase
        .from("room_players")
        .select("seat_number")
        .eq("room_id", room.id);

      const taken = occupied?.map((p: any) => p.seat_number) || [];
      let seatNumber = 2;
      for (let i = 2; i <= 4; i++) {
        if (!taken.includes(i)) {
          seatNumber = i;
          break;
        }
      }

      await supabase.from("room_players").insert({
        room_id: room.id,
        user_id: user.id,
        seat_number: seatNumber,
        username: user.username,
        is_host: false,
      });

      await supabase
        .from("game_rooms")
        .update({ current_players: room.current_players + 1 })
        .eq("id", room.id);

      Alert.alert("Success!", `You joined as Player ${seatNumber}`);
      return room;
    } catch (error: any) {
      console.error("Join Error:", error);
      Alert.alert("Join Failed", error.message);
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { joinRoom, loading };
};
