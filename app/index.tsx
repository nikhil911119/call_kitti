import { router } from "expo-router";
import React from "react";
import { StatusBar, StyleSheet, Text, View } from "react-native";
import { AppButton } from "../src/components/AppButton";
import { colors } from "../src/theme/tokens";
export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <StatusBar hidden />
      <Text style={styles.title}>CALL KITTI</Text>
      <Text style={styles.subtitle}>Enjoy your favorite card game.</Text>

      <View style={styles.divider} />

      <AppButton
        label="Create Room"
        onPress={() => router.push("/create" as any)}
        style={styles.btn}
      />

      <AppButton
        label="Join Room"
        onPress={() => router.push("/join" as any)}
        variant="secondary"
        style={styles.btn}
      />
      <Text style={styles.footer}>Aaryan|Loojah|Nikhil</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
  },
  btn: {
    width: "100%",
    marginBottom: 16,
  },
  title: {
    fontSize: 46,
    fontWeight: "900",
    color: colors.white,
    textAlign: "center",
    lineHeight: 58,
    marginBottom: 0,
    letterSpacing: -1.5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.muted,
    textAlign: "center",
    marginBottom: 10,
  },
  divider: {
    width: 48,
    height: 2,
    backgroundColor: colors.border,
    borderRadius: 1,
    marginBottom: 40,
    display: "flex",
  },
  footer: {
    fontSize: 12,
    color: colors.muted,
    opacity: 0.5,
    letterSpacing: 0.3,
  },
});
